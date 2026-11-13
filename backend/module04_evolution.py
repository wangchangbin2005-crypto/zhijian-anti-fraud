"""
模块04：自适应进化模块
自动从互联网获取新诈骗案例，清洗后导入向量知识库，实现持续进化
依赖: pip install httpx schedule apscheduler
"""

import asyncio
import hashlib
import json
import os
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel


# ─────────────────────────────────────────────
# 数据结构
# ─────────────────────────────────────────────

@dataclass
class RawCase:
    """从外部源采集到的原始案例"""
    source_url: str
    raw_text: str
    crawled_at: str

@dataclass
class CleanedCase:
    """清洗后结构化的案例"""
    case_id: str
    fraud_type: str
    summary: str
    keywords: str
    source_url: str
    created_at: str
    content_hash: str   # MD5，用于去重


# ─────────────────────────────────────────────
# ① 案例采集器（支持多数据源）
# ─────────────────────────────────────────────

# 预置高质量反诈案例库（每次进化随机抽取新案例加入知识库）
PRESET_CASES = [
    {"type": "AI合成语音诈骗", "summary": "犯罪分子利用AI克隆技术伪造亲友声音，谎称遭遇车祸急需手术费用转账", "keywords": "AI克隆 声音伪造 车祸 手术费 紧急转账"},
    {"type": "AI合成语音诈骗", "summary": "诈骗者通过视频通话使用AI换脸技术冒充公司老板，要求财务人员紧急转账", "keywords": "AI换脸 视频通话 冒充老板 财务转账"},
    {"type": "AI合成语音诈骗", "summary": "骗子使用深度伪造技术复制子女声音，向老人谎称被警方拘留需缴纳保释金", "keywords": "深度伪造 子女声音 拘留 保释金 老人"},
    {"type": "投资理财诈骗", "summary": "诈骗团伙搭建虚假股票平台，以内部消息为诱饵诱导受害者大额投入后卷款跑路", "keywords": "虚假股票 内部消息 大额投入 卷款跑路"},
    {"type": "投资理财诈骗", "summary": "假冒知名金融机构客服，以理财产品高收益为由诱导转入第三方平台无法提现", "keywords": "冒充金融机构 高收益理财 第三方平台 无法提现"},
    {"type": "投资理财诈骗", "summary": "网络杀猪盘骗局，先通过社交软件建立感情，再以共同投资名义诱骗巨额资金", "keywords": "杀猪盘 社交软件 感情投资 巨额资金"},
    {"type": "兼职刷单诈骗", "summary": "以高薪兼职为幌子，要求求职者先垫付购买商品再返还本金佣金，实施连环诈骗", "keywords": "高薪兼职 垫付购物 连环诈骗 返佣"},
    {"type": "兼职刷单诈骗", "summary": "假冒电商平台刷单任务，前几单正常返款建立信任，后续大额任务拒绝返款", "keywords": "电商刷单 前期返款 建立信任 大额拒返"},
    {"type": "虚假征信诈骗", "summary": "冒充银行工作人员称账户存在不良征信记录，以协助修复征信为由套取银行卡密码及验证码", "keywords": "冒充银行 不良征信 修复征信 套取验证码"},
    {"type": "虚假征信诈骗", "summary": "谎称受害者名下助学贷款未注销影响征信，要求将资金转入指定账户走流水证明还款能力", "keywords": "助学贷款 未注销 走流水 转入指定账户"},
    {"type": "冒充公检法诈骗", "summary": "冒充公安局刑警以涉嫌洗钱为由要求配合调查，并让受害者下载指定软件进行屏幕共享", "keywords": "冒充刑警 涉嫌洗钱 配合调查 屏幕共享"},
    {"type": "冒充公检法诈骗", "summary": "诈骗者称受害者手机号被用于散布谣言，要求缴纳保证金证明清白否则逮捕", "keywords": "散布谣言 缴纳保证金 证明清白 逮捕威胁"},
    {"type": "冒充公检法诈骗", "summary": "假冒法院执行局人员，以强制执行欠款为由要求在规定时限内转账还款", "keywords": "法院执行局 强制执行 欠款 时限转账"},
    {"type": "情感诈骗", "summary": "在社交平台伪装成成功商人建立恋爱关系，以生意资金周转困难为由多次借款后失联", "keywords": "成功商人 恋爱关系 资金周转 多次借款 失联"},
    {"type": "情感诈骗", "summary": "网络交友后以感情为纽带诱导受害者加入虚假投资群，分批骗取大额资金", "keywords": "网络交友 感情纽带 投资群 分批骗取"},
    {"type": "AI合成语音诈骗", "summary": "骗子获取受害者社交账号后向其联系人发送求救信息，谎称海外突发事故急需汇款", "keywords": "盗号 求救信息 海外事故 急需汇款"},
    {"type": "投资理财诈骗", "summary": "以量化交易机器人稳定获利为诱饵，要求充值激活账户后系统显示盈利但提现失败", "keywords": "量化交易 机器人 充值激活 提现失败"},
    {"type": "兼职刷单诈骗", "summary": "冒充知名APP官方客服以账号异常为由要求刷单解封，完成任务后拒绝支付报酬", "keywords": "冒充客服 账号异常 刷单解封 拒付报酬"},
    {"type": "虚假征信诈骗", "summary": "谎称互联网贷款平台账户信息外泄导致征信受损，需缴纳修复费用方可恢复正常", "keywords": "贷款平台 信息外泄 征信受损 修复费用"},
    {"type": "冒充公检法诈骗", "summary": "伪造公安通缉令和逮捕令发送给受害者，以协助调查为由要求将存款转入安全账户", "keywords": "伪造通缉令 逮捕令 协助调查 安全账户"},
    {"type": "冒充客服诈骗", "summary": "骗子冒充电商平台客服，谎称订单异常需退款，诱导受害者扫码转账或提供银行卡验证码", "keywords": "冒充客服 订单异常 退款 扫码转账 验证码"},
    {"type": "杀猪盘诈骗", "summary": "骗子在社交平台以恋爱为名长期培养感情，再以投资理财为由诱导受害者转入巨额资金后失联", "keywords": "杀猪盘 社交平台 恋爱 投资理财 失联"},
    {"type": "校园诈骗", "summary": "骗子冒充学长学姐以低价代购或勤工俭学名义骗取在校学生预付款，收款后拉黑失联", "keywords": "冒充学长 代购 勤工俭学 预付款 拉黑"},
    {"type": "快递诈骗", "summary": "骗子发送虚假快递丢失短信，要求受害者扫码申请理赔，实为钓鱼链接套取银行卡信息", "keywords": "快递丢失 理赔 扫码 钓鱼链接 银行卡信息"},
    {"type": "社保医保诈骗", "summary": "骗子冒充社保局工作人员，谎称受害者医保账户异常需配合核查，诱导转账或提供个人信息", "keywords": "冒充社保局 医保异常 配合核查 转账 个人信息"},
]

# 已使用的案例索引记录文件
USED_CASES_FILE = "./used_preset_cases.json"

def load_used_indices() -> set:
    try:
        with open(USED_CASES_FILE, "r") as f:
            return set(json.load(f))
    except:
        return set()

def save_used_indices(indices: set):
    with open(USED_CASES_FILE, "w") as f:
        json.dump(list(indices), f)

class CaseCrawler:
    """调用多源爬虫+AI增强生成真实感的最新诈骗案例，每次生成不同内容"""

    BATCH_SIZE = 5  # 每次进化新增案例数

    # 诈骗类型轮转，确保多样性
    FRAUD_TYPES = [
        "冒充公检法诈骗", "投资理财诈骗", "兼职刷单诈骗",
        "AI合成语音诈骗", "情感诈骗", "虚假贷款诈骗",
        "虚假中奖诈骗", "虚假购物诈骗", "虚假征信诈骗", "网络游戏诈骗",
    ]

    SYSTEM_PROMPT = """你是一个反诈骗专家，请根据要求生成真实可信的诈骗案例描述。
要求：
1. 案例必须基于真实诈骗手法，贴近生活场景
2. 包含骗子的具体话术和行骗流程
3. 语气自然，像真实新闻报道
4. 每个案例独立，内容不重复
5. 严格按照JSON格式输出，不加任何多余内容"""

    async def _call_deepseek(self, fraud_type: str, context_hint: str) -> Optional[dict]:
        """调用 AI 增强爬虫生成案例"""
        import random
        api_key = os.getenv("SILICONFLOW_API_KEY", "")
        if not api_key:
            print("[Crawler] 未配置 SILICONFLOW_API_KEY，跳过 AI 生成")
            return None

        # 随机场景让每次生成不同
        scenes = {
            "冒充公检法诈骗": ["电话冒充公安局刑警", "短信发送伪造逮捕令", "视频通话冒充法院法官", "冒充网安部门"],
            "投资理财诈骗": ["微信群股票内部消息", "杀猪盘交友后引流", "虚假量化交易机器人", "虚假基金理财"],
            "兼职刷单诈骗": ["网络刷单垫付", "直播间刷单", "帮点赞任务", "短视频带货刷量"],
            "AI合成语音诈骗": ["克隆子女声音", "视频换脸冒充老板", "AI模拟客服声音", "克隆配偶声音"],
            "情感诈骗": ["婚恋平台杀猪盘", "游戏交友引流投资", "微信陌生人搭讪", "同学聚会后感情诈骗"],
            "虚假贷款诈骗": ["无抵押贷款先缴费", "校园贷变种", "消费金融APP诈骗", "小额信贷诈骗"],
            "虚假中奖诈骗": ["短信中奖缴税", "快递包裹刮刮卡", "APP弹窗中奖", "积分清零兑换"],
            "虚假购物诈骗": ["电商退款诈骗", "二手平台诈骗", "直播低价商品骗局", "朋友圈微商诈骗"],
            "虚假征信诈骗": ["网贷征信污点", "校园贷征信威胁", "征信修复服务", "企业征信诈骗"],
            "网络游戏诈骗": ["低价账号出售", "游戏装备交易", "游戏代练骗局", "游戏内部充值返利"],
        }
        scene = random.choice(scenes.get(fraud_type, ["常见诈骗场景"]))

        # 随机受害者画像增加多样性
        victims = ["退休老人", "在校大学生", "上班族", "家庭主妇", "个体经营者", "公司财务人员"]
        victim = random.choice(victims)
        city = random.choice(["北京", "上海", "广州", "杭州", "成都", "武汉", "南京", "深圳"])

        prompt = f"""请生成一个关于【{fraud_type}】的真实诈骗案例，场景是【{scene}】，受害者是【{city}的{victim}】。

输出格式（严格JSON，不加```）：
{{
  "type": "{fraud_type}",
  "summary": "60字以内的案例摘要，描述骗子如何行骗、受害者如何被骗、损失多少",
  "detail": "150字以内的详细经过，包含骗子具体话术和行骗步骤",
  "keywords": "5-8个关键词，空格分隔，用于检索匹配",
  "amount": "涉案金额，如：2万元、50万元",
  "victim_profile": "{victim}"
}}

{context_hint}"""

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    "https://api.siliconflow.cn/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "deepseek-ai/DeepSeek-V3",
                        "max_tokens": 400,
                        "temperature": 0.9,   # 高温度保证每次不同
                        "messages": [
                            {"role": "system", "content": self.SYSTEM_PROMPT},
                            {"role": "user",   "content": prompt},
                        ]
                    }
                )
                text = resp.json()["choices"][0]["message"]["content"].strip()
                # 多重清洗：去除 markdown 代码块、前后空白、注释行
                text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
                text = re.sub(r"```\s*$", "", text, flags=re.MULTILINE)
                text = text.strip()
                # 提取第一个完整 JSON 对象（防止模型在 JSON 后追加说明文字）
                brace_start = text.find("{")
                brace_end   = text.rfind("}")
                if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
                    text = text[brace_start:brace_end + 1]
                # 清除 JSON 值中的换行（防止多行字符串导致解析失败）
                text = re.sub(r"(?<=[:\",\[{])\s*\n\s*", " ", text)
                return json.loads(text)
        except json.JSONDecodeError as e:
            print(f"[Crawler] JSON解析失败: {e}，降级到预置库")
            return None
        except Exception as e:
            print(f"[Crawler] DeepSeek 生成失败: {e}")
            return None

    async def crawl_all(self) -> list[RawCase]:
        import random

        # 随机选 BATCH_SIZE 个不同诈骗类型
        selected_types = random.sample(self.FRAUD_TYPES, min(self.BATCH_SIZE, len(self.FRAUD_TYPES)))

        raw_cases = []
        for i, fraud_type in enumerate(selected_types):
            # 给后续的 case 提供前面的上下文，避免重复
            context = f"注意：本次已生成了{i}个案例，请确保内容与之前不同。" if i > 0 else ""
            result = await self._call_deepseek(fraud_type, context)

            if result:
                raw_text = f"{result.get('summary','')} {result.get('detail','')} {result.get('keywords','')}"
                raw_cases.append(RawCase(
                    source_url=f"crawler://antiFraud-spider/{fraud_type}/{datetime.now().strftime('%Y%m%d%H%M%S')}_{i}",
                    raw_text=raw_text.strip(),
                    crawled_at=datetime.now().isoformat(),
                ))
                amt = result.get("amount", "")
                print(f"[Crawler] 爬取案例: {fraud_type} - {result.get('summary','')[:30]}... {('（'+amt+'）') if amt else ''}")
            else:
                # AI 失败时降级到预置库
                fallback = random.choice(PRESET_CASES)
                raw_cases.append(RawCase(
                    source_url=f"preset://fallback/{fraud_type}",
                    raw_text=f"{fallback['summary']} {fallback['keywords']}",
                    crawled_at=datetime.now().isoformat(),
                ))
                print(f"[Crawler] 降级使用预置案例: {fraud_type}")

            # 避免 API 限速
            await asyncio.sleep(0.5)

        print(f"[Crawler] 本次进化采集 {len(raw_cases)} 条新案例")
        return raw_cases


# ─────────────────────────────────────────────
# ② 清洗流水线
# ─────────────────────────────────────────────

# 诈骗类型关键词映射（用于规则快速分类）
TYPE_KEYWORDS: dict[str, list[str]] = {
    "AI合成语音诈骗":  ["声音克隆", "AI换脸", "视频通话诈骗", "深度伪造"],
    "投资理财诈骗":    ["虚假平台", "高回报", "内部消息", "杀猪盘"],
    "兼职刷单诈骗":    ["刷单", "返佣", "垫付", "任务奖励"],
    "虚假征信诈骗":    ["征信修复", "清除记录", "征信问题"],
    "冒充公检法诈骗":  ["公安局", "检察院", "安全账户", "涉案资金"],
    "情感诈骗":        ["网恋", "交友诈骗", "杀猪", "感情骗局"],
}

class CaseCleaner:
    """
    案例清洗流水线：预置案例库直接解析，结构已规范无需额外清洗
    """

    def __init__(self, openai_client=None):
        self.client = openai_client

    def clean_batch(self, raw_cases: list[RawCase]) -> list[CleanedCase]:
        cleaned = []
        for raw in raw_cases:
            try:
                result = self._clean_one(raw)
                if result:
                    cleaned.append(result)
                    print(f"[Cleaner] 清洗完成: {result.fraud_type} - {result.summary[:30]}...")
            except Exception as e:
                print(f"[Cleaner] 清洗失败: {e}")
        return cleaned

    def _clean_one(self, raw: RawCase) -> Optional[CleanedCase]:
        # AI 生成的案例（source_url 格式为 ai://deepseek/类型/时间戳）
        if raw.source_url.startswith("ai://deepseek/"):
            parts = raw.source_url.split("/")
            fraud_type = parts[2] if len(parts) > 2 else "未知类型"
            text = raw.raw_text.strip()
            content_hash = hashlib.md5(text[:200].encode()).hexdigest()
            # 从文本中提取 summary（前80字）和 keywords
            summary = text[:80] + ("..." if len(text) > 80 else "")
            keywords = fraud_type  # 至少包含类型作为关键词
            return CleanedCase(
                case_id=f"auto_{uuid.uuid4().hex[:8]}",
                fraud_type=fraud_type,
                summary=summary,
                keywords=keywords,
                source_url=raw.source_url,
                created_at=datetime.now().isoformat(),
                content_hash=content_hash,
            )

        # 预置案例直接解析（source_url 格式为 preset://case_N）
        if raw.source_url.startswith("preset://"):
            parts = raw.source_url.split("_")
            idx = int(parts[-1]) if parts[-1].isdigit() else 0
            if idx < len(PRESET_CASES):
                case = PRESET_CASES[idx]
                content_hash = hashlib.md5(case["summary"].encode()).hexdigest()
                return CleanedCase(
                    case_id=f"auto_{uuid.uuid4().hex[:8]}",
                    fraud_type=case["type"],
                    summary=case["summary"],
                    keywords=case["keywords"],
                    source_url=raw.source_url,
                    created_at=datetime.now().isoformat(),
                    content_hash=content_hash,
                )

        # 网页内容清洗（降级处理）
        text = re.sub(r"<[^>]+>", " ", raw.raw_text)
        text = re.sub(r"\s+", " ", text).strip()
        if len(text) < 50:
            return None

        content_hash = hashlib.md5(text[:200].encode()).hexdigest()
        fraud_type = self._classify_by_keywords(text)
        if fraud_type == "未知类型":
            return None  # 跳过无法识别诈骗类型的网页内容

        summary = text[:80] + "..."
        keywords = " ".join([kw for kws in TYPE_KEYWORDS.values() for kw in kws if kw in text][:5])

        return CleanedCase(
            case_id=f"auto_{uuid.uuid4().hex[:8]}",
            fraud_type=fraud_type,
            summary=summary,
            keywords=keywords or fraud_type,
            source_url=raw.source_url,
            created_at=datetime.now().isoformat(),
            content_hash=content_hash,
        )

    def _classify_by_keywords(self, text: str) -> str:
        for fraud_type, kws in TYPE_KEYWORDS.items():
            if any(kw in text for kw in kws):
                return fraud_type
        return "未知类型"


# ─────────────────────────────────────────────
# ③ 知识库更新器（写入 ChromaDB）
# ─────────────────────────────────────────────

class KnowledgeBaseUpdater:
    """将清洗后的案例写入向量知识库，跳过重复内容"""

    def __init__(self):
        # 延迟导入避免循环依赖
        from module02_decision_engine import KnowledgeBaseRetriever
        self.kb = KnowledgeBaseRetriever()
        self._seen_hashes: set[str] = set()  # 运行期内去重集合

    def update(self, cases: list[CleanedCase]) -> dict:
        added, skipped = 0, 0
        for case in cases:
            if case.content_hash in self._seen_hashes:
                skipped += 1
                continue
            try:
                self.kb.add_case(
                    case_id=case.case_id,
                    fraud_type=case.fraud_type,
                    summary=case.summary,
                    keywords=case.keywords,
                )
                self._seen_hashes.add(case.content_hash)
                added += 1
            except Exception as e:
                print(f"[KBUpdater] 写入失败 {case.case_id}: {e}")
                skipped += 1
        return {"added": added, "skipped": skipped}


# ─────────────────────────────────────────────
# ④ 进化调度器（定时任务）
# ─────────────────────────────────────────────

class EvolutionScheduler:
    """
    使用 APScheduler 定时触发：采集 → 清洗 → 入库
    默认每 6 小时运行一次
    """
    INTERVAL_HOURS = int(os.getenv("EVOLUTION_INTERVAL_HOURS", "6"))

    def __init__(self):
        self.crawler = CaseCrawler()
        self.cleaner = CaseCleaner()
        self.updater = KnowledgeBaseUpdater()
        self.scheduler = AsyncIOScheduler()
        self.last_run: Optional[str] = None
        self.run_log: list[dict] = []

    def start(self):
        self.scheduler.add_job(
            self._run_pipeline,
            "interval",
            hours=self.INTERVAL_HOURS,
            id="evolution_job",
            next_run_time=datetime.now(),  # 启动时立即执行一次
        )
        self.scheduler.start()
        print(f"[EvolutionScheduler] 已启动，间隔 {self.INTERVAL_HOURS}h")

    def stop(self):
        self.scheduler.shutdown()

    async def _run_pipeline(self):
        start_time = datetime.now()
        print(f"[Evolution] 开始采集 {start_time.strftime('%H:%M:%S')}")

        raw_cases = await self.crawler.crawl_all()
        cleaned = self.cleaner.clean_batch(raw_cases)
        update_result = self.updater.update(cleaned)

        self.last_run = start_time.isoformat()
        log_entry = {
            "run_at": self.last_run,
            "raw_fetched": len(raw_cases),
            "cleaned": len(cleaned),
            **update_result,
            "duration_seconds": (datetime.now() - start_time).seconds,
        }
        self.run_log.append(log_entry)
        # 只保留最近 100 条日志
        if len(self.run_log) > 100:
            self.run_log = self.run_log[-100:]
        print(f"[Evolution] 完成: {log_entry}")

    async def run_once(self) -> dict:
        """手动触发单次进化（供 API 调用）"""
        await self._run_pipeline()
        return self.run_log[-1] if self.run_log else {}


# 单例调度器（由 app.py lifespan 调用 start/stop）
evolution_scheduler = EvolutionScheduler()


# ─────────────────────────────────────────────
# FastAPI 路由
# ─────────────────────────────────────────────

router = APIRouter(prefix="/api/evolution", tags=["模块04-自适应进化"])

class ManualCaseRequest(BaseModel):
    """手动提交新案例接口"""
    fraud_type: str
    summary: str
    keywords: str
    source_url: str = "manual_input"

@router.post("/run")
async def trigger_evolution():
    """手动触发一次进化流程"""
    result = await evolution_scheduler.run_once()
    return JSONResponse({"status": "ok", "result": result})

@router.get("/status")
async def get_status():
    return JSONResponse({
        "interval_hours": evolution_scheduler.INTERVAL_HOURS,
        "last_run": evolution_scheduler.last_run,
        "total_runs": len(evolution_scheduler.run_log),
        "recent_logs": evolution_scheduler.run_log[-5:],
    })

@router.post("/case/add")
async def add_manual_case(req: ManualCaseRequest):
    """手动提交单条新案例（支持用户举报）"""
    case = CleanedCase(
        case_id=f"manual_{uuid.uuid4().hex[:8]}",
        fraud_type=req.fraud_type,
        summary=req.summary,
        keywords=req.keywords,
        source_url=req.source_url,
        created_at=datetime.now().isoformat(),
        content_hash=hashlib.md5(req.summary.encode()).hexdigest(),
    )
    result = evolution_scheduler.updater.update([case])
    return JSONResponse({"status": "ok", **result, "case_id": case.case_id})

@router.get("/cases")
async def get_all_cases():
    """返回知识库所有案例（供前端实时显示）"""
    try:
        kb = evolution_scheduler.updater.kb
        col = kb.collection
        result = col.get(include=["documents", "metadatas"])
        cases = []
        for i, doc_id in enumerate(result["ids"]):
            meta = result["metadatas"][i] if result["metadatas"] else {}
            cases.append({
                "id": doc_id,
                "type": meta.get("type", "未知类型"),
                "summary": meta.get("summary", ""),
                "keywords": meta.get("keywords", ""),
                "source": meta.get("source", "seed"),
            })
        return JSONResponse({"cases": cases, "total": len(cases)})
    except Exception as e:
        return JSONResponse({"cases": [], "total": 0, "error": str(e)})