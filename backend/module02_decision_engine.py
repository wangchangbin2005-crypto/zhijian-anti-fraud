"""
模块02：智能识别与决策引擎
基于《反诈宝典》（通用版/大学生版/老年人版）+ 搜狗/百度反诈数据集扩充
包含意图识别、知识库检索、多模态融合判别、个性化风险评估
依赖: pip install openai chromadb sentence-transformers
"""

import json
import os
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

import chromadb
from openai import OpenAI
from sentence_transformers import SentenceTransformer

from module01_multimodal_input import MultimodalInput


class RiskLevel(str, Enum):
    SAFE     = "safe"
    LOW      = "low"
    MEDIUM   = "medium"
    HIGH     = "high"
    CRITICAL = "critical"


class FraudType(str, Enum):
    AI_VOICE      = "AI合成语音诈骗"
    INVESTMENT    = "投资理财诈骗"
    PART_TIME     = "兼职刷单诈骗"
    FAKE_CREDIT   = "虚假征信诈骗"
    IMPERSONATION = "冒充公检法诈骗"
    ROMANCE       = "情感诈骗"
    FAKE_SHOPPING = "虚假购物诈骗"
    LOAN_FRAUD    = "虚假贷款诈骗"
    PRIZE_FRAUD   = "虚假中奖诈骗"
    GAME_FRAUD    = "网络游戏诈骗"
    UNKNOWN       = "未知类型"


@dataclass
class UserProfile:
    user_id: str
    role: str = "adult"
    risk_history: list = field(default_factory=list)
    sensitivity_boost: float = 1.0


@dataclass
class DecisionResult:
    risk_level: RiskLevel
    fraud_type: FraudType
    confidence: float
    intent: str
    evidence: list
    similar_cases: list
    explanation: str
    raw_score: float


INTENT_SYSTEM_PROMPT = """你是反诈骗分析专家。只输出JSON，不加任何多余内容。
格式：{"intent":"<10字内>","is_suspicious":<bool>,"fraud_type":"<类型>","evidence":["词"],"suspicion_score":<0-100>}
fraud_type：AI合成语音诈骗|投资理财诈骗|兼职刷单诈骗|虚假征信诈骗|冒充公检法诈骗|情感诈骗|虚假购物诈骗|虚假贷款诈骗|虚假中奖诈骗|网络游戏诈骗|无诈骗|未知类型
规则：日常对话score=0；涉及转账/充值/安全账户/垫付/保证金才给高分。
示例：
输入：我是公安局，账号涉案转到安全账户不能告诉家人→{"intent":"冒充警察要求转账","is_suspicious":true,"fraud_type":"冒充公检法诈骗","evidence":["自称警察","安全账户"],"suspicion_score":96}
输入：买火车票12306是官方吗→{"intent":"正常购票咨询","is_suspicious":false,"fraud_type":"无诈骗","evidence":[],"suspicion_score":0}
"""


class IntentRecognizer:
    def __init__(self, client, model: str = "qwen-turbo"):
        self.client = client
        self.model = model

    def analyze(self, modal_input: MultimodalInput) -> dict:
        messages = [{"role": "system", "content": INTENT_SYSTEM_PROMPT}]
        user_content = []
        if modal_input.text:
            user_content.append({"type": "text", "text": f"对话内容：\n{modal_input.text}"})
        if modal_input.image_b64:
            user_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{modal_input.image_b64}"}
            })
        messages.append({"role": "user", "content": user_content or [{"type": "text", "text": "(空输入)"}]})
        response = self.client.chat.completions.create(
            model=self.model, messages=messages, temperature=0.1, max_tokens=256,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)


# ─────────────────────────────────────────────
# 知识库案例（基于三本反诈宝典 + JSON数据集整理，共23条，覆盖10种类型）
# ─────────────────────────────────────────────
SEED_CASES = [
    # AI合成语音诈骗 - 来源：反诈宝典通用版 + 老年人版
    {"id": "case001", "type": "AI合成语音诈骗",
     "summary": "骗子使用AI克隆亲人声音，声称出事急需手术押金转账",
     "keywords": "声音克隆 视频通话 紧急转账 亲属 冒充家人 手机摔坏 不能打电话 押金",
     "source": "反诈宝典通用版"},
    {"id": "case002", "type": "AI合成语音诈骗",
     "summary": "视频通话中AI换脸冒充领导，要求财务紧急打款到陌生账户保密",
     "keywords": "换脸 视频 领导 紧急 转账 保密 公司项目 对公账户 财务",
     "source": "反诈宝典通用版"},
    {"id": "case022", "type": "AI合成语音诈骗",
     "summary": "冒充子女遭遇车祸住院，要求老人立刻汇款到指定账户支付手术费",
     "keywords": "车祸 手术 住院 家人出事 急需汇款 交警 医院 保证金 老人",
     "source": "反诈宝典老年人版"},

    # 投资理财诈骗 - 来源：反诈宝典通用版 + 老年人版 + 搜狗
    {"id": "case003", "type": "投资理财诈骗",
     "summary": "虚假平台承诺高回报，微信群导师带单，充值后无法提现跑路",
     "keywords": "高回报 内部消息 充值 提现失败 稳赚不赔 平台 群友 导师 微信群",
     "source": "反诈宝典+搜狗"},
    {"id": "case004", "type": "投资理财诈骗",
     "summary": "假冒证券公司推荐内幕股票，开户充值后平台关闭失联",
     "keywords": "股票 内幕 开户 充值 证券 跑路 失联 炒外汇 炒比特币 虚拟货币",
     "source": "搜狗数据集"},
    {"id": "case005", "type": "投资理财诈骗",
     "summary": "以高额分红为诱饵发展会员，老人投入全部积蓄后平台跑路",
     "keywords": "高额分红 会费 金卡 银卡 发展下线 养老投资 收藏品 非法集资 传销",
     "source": "反诈宝典老年人版"},
    {"id": "case021", "type": "投资理财诈骗",
     "summary": "冒充多年未联系老友借款，以急用钱为由要求汇款",
     "keywords": "老友 借款 换号码 急用钱 汇款 多年不见 老同学 工友",
     "source": "反诈宝典老年人版"},

    # 兼职刷单诈骗 - 来源：反诈宝典通用版 + 大学生版
    {"id": "case006", "type": "兼职刷单诈骗",
     "summary": "以刷单返佣为由，先返小额建立信任，大额垫付后拒绝提现",
     "keywords": "刷单 返利 佣金 垫付 任务 兼职 卡单 解冻 升级VIP 日入过百 返款",
     "source": "反诈宝典+搜狗"},
    {"id": "case007", "type": "兼职刷单诈骗",
     "summary": "以大学生勤工俭学为诱饵，刷单任务完成后系统冻结拒绝返款",
     "keywords": "大学生 兼职 刷单 返佣 任务未完成 系统故障 账号冻结 学费 零花钱",
     "source": "反诈宝典大学生版"},
    {"id": "case023", "type": "兼职刷单诈骗",
     "summary": "高薪招聘出境工作，到达后被迫参与跨境诈骗或缴纳高额赎金",
     "keywords": "高薪招聘 出境 包吃包住 缅甸 赎金 人身自由 虚假招聘 培训费 服装费",
     "source": "反诈宝典大学生版"},

    # 虚假征信诈骗 - 来源：反诈宝典通用版 + 大学生版
    {"id": "case008", "type": "虚假征信诈骗",
     "summary": "冒充金融机构称存在不良征信记录，诱导转账清除记录",
     "keywords": "征信 银行 记录 清除 配合 贷款 消除 人民银行 12363 征信异常",
     "source": "反诈宝典通用版"},
    {"id": "case009", "type": "虚假征信诈骗",
     "summary": "冒充平台客服称需注销校园贷账户，否则影响征信，诱导贷款转账",
     "keywords": "注销校园贷 征信影响 银监会 升级账户 刷流水 贷款转账 大学生 毕业",
     "source": "反诈宝典大学生版"},

    # 冒充公检法诈骗 - 来源：反诈宝典通用版 + 老年人版
    {"id": "case010", "type": "冒充公检法诈骗",
     "summary": "假冒警察称账号涉案，要求转账到安全账户并不能告知家人",
     "keywords": "警察 检察院 涉案 安全账户 保密 洗钱 通缉令 不能告诉家人 配合调查",
     "source": "反诈宝典通用版"},
    {"id": "case011", "type": "冒充公检法诈骗",
     "summary": "冒充警察称医保卡被用于购买违禁药品，要求转账到安全账户自证清白",
     "keywords": "医保卡 违禁药品 安全账户 转账 保密 立案调查 冻结 协助 老年人",
     "source": "反诈宝典老年人版"},
    {"id": "case012", "type": "冒充公检法诈骗",
     "summary": "自称公安让安装屏幕共享软件配合调查，实为远程盗取账户资金",
     "keywords": "屏幕共享 远程控制 配合调查 涉案账户 软件 安装 录音取证 APP",
     "source": "搜狗数据集"},

    # 情感诈骗 - 来源：反诈宝典通用版
    {"id": "case013", "type": "情感诈骗",
     "summary": "网络交友杀猪盘，以各种理由诱导投资博彩平台或借款后消失",
     "keywords": "网恋 借款 投资 感情 礼物 出国 手续费 博彩 杀猪盘 交友",
     "source": "反诈宝典通用版"},
    {"id": "case014", "type": "情感诈骗",
     "summary": "以相亲交友获取信任后，诱导投资声称有博彩平台漏洞可稳赚",
     "keywords": "相亲 感情 信任 博彩 漏洞 赢一把就跑 平台 转账 错拨电话 加微信",
     "source": "反诈宝典通用版"},

    # 虚假购物诈骗 - 来源：反诈宝典通用版 + 搜狗
    {"id": "case015", "type": "虚假购物诈骗",
     "summary": "假冒电商客服以产品有质量问题为由联系退款，诱导转账或开通网贷",
     "keywords": "退款 客服 产品质量 银行卡 验资 回执单 赔偿 开通网贷 假冒客服 三倍",
     "source": "反诈宝典+搜狗"},
    {"id": "case016", "type": "虚假购物诈骗",
     "summary": "低价销售虚假商品，收款后发假货或失联拒绝退款",
     "keywords": "低价 假货 链接 不发货 客服失联 退款拒绝 私下交易 快递丢失",
     "source": "搜狗数据集"},

    # 虚假贷款诈骗 - 来源：反诈宝典大学生版 + 搜狗
    {"id": "case017", "type": "虚假贷款诈骗",
     "summary": "以无抵押低息快速放款为诱饵，要求先缴纳保证金手续费后跑路",
     "keywords": "免抵押 低息 快速放款 10秒到账 手续费 保证金 解冻费 贷款 刷流水",
     "source": "反诈宝典大学生版+搜狗"},

    # 虚假中奖诈骗 - 来源：反诈宝典通用版
    {"id": "case018", "type": "虚假中奖诈骗",
     "summary": "冒充平台或节目发送中奖通知，要求缴纳税费手续费才能领取奖品",
     "keywords": "恭喜中奖 领奖 手续费 税费 激活费 刮刮卡 三星索尼大奖 个人所得税 奖金",
     "source": "反诈宝典通用版"},

    # 网络游戏诈骗 - 来源：反诈宝典大学生版 + 百度
    {"id": "case019", "type": "网络游戏诈骗",
     "summary": "假冒游戏客服推送官网充值活动，账号密码被盗改充值资金消失",
     "keywords": "游戏充值 皮肤 装备 官网活动 客服 账号被盗 密码修改 绑定手机 免费送",
     "source": "反诈宝典大学生版+百度"},
    {"id": "case020", "type": "网络游戏诈骗",
     "summary": "高价收购游戏账号诱骗，在第三方平台交易，以冻结为由多次骗款",
     "keywords": "收购账号 高价 第三方平台 冻结 激活 解冻费 押金 代打 皮肤出售",
     "source": "百度数据集"},
]


class KnowledgeBaseRetriever:
    COLLECTION_NAME = "fraud_cases_v3"

    def __init__(self, embed_model: str = "paraphrase-multilingual-MiniLM-L12-v2"):
        self.chroma = chromadb.PersistentClient(path="./chroma_db")
        self.embedder = SentenceTransformer(embed_model)
        self._ensure_collection()

    def _ensure_collection(self):
        existing = [c.name for c in self.chroma.list_collections()]
        if self.COLLECTION_NAME not in existing:
            print(f"[KB] 初始化知识库 {self.COLLECTION_NAME}，共 {len(SEED_CASES)} 条案例...")
            col = self.chroma.create_collection(
                self.COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
            docs = [
                f"{c['type']}：{c['summary']} 关键词：{c['keywords']}"
                for c in SEED_CASES
            ]
            embeddings = self.embedder.encode(docs, normalize_embeddings=True).tolist()
            col.add(
                ids=[c["id"] for c in SEED_CASES],
                documents=docs,
                embeddings=embeddings,
                metadatas=[{
                    "type": c["type"],
                    "summary": c["summary"],
                    "keywords": c["keywords"],
                    "source": c.get("source", "seed"),
                } for c in SEED_CASES],
            )
            print(f"[KB] 知识库初始化完成，共 {len(SEED_CASES)} 条")
        self.collection = self.chroma.get_collection(self.COLLECTION_NAME)

    def search(self, query: str, top_k: int = 3) -> list:
        embedding = self.embedder.encode([query], normalize_embeddings=True).tolist()
        results = self.collection.query(query_embeddings=embedding, n_results=top_k)
        cases = []
        for i in range(len(results["documents"][0])):
            distance = results["distances"][0][i]
            similarity = round(max(0.0, min(1.0, 1.0 - distance / 2.0)), 3)
            cases.append({
                "id":         results["ids"][0][i],
                "similarity": similarity,
                "type":       results["metadatas"][0][i]["type"],
                "summary":    results["metadatas"][0][i]["summary"],
            })
        return cases

    def add_case(self, case_id: str, fraud_type: str, summary: str, keywords: str):
        text = f"{fraud_type}：{summary} 关键词：{keywords}"
        embedding = self.embedder.encode([text], normalize_embeddings=True).tolist()
        try:
            self.collection.add(
                ids=[case_id],
                documents=[text],
                embeddings=embedding,
                metadatas=[{"type": fraud_type, "summary": summary, "keywords": keywords, "source": "manual"}],
            )
            print(f"[KB] 新增案例: {case_id} ({fraud_type})")
        except Exception as e:
            print(f"[KB] 添加案例失败（可能重复）: {e}")


# 各角色风险阈值（老年人/学生阈值更低，更容易触发预警）
ROLE_THRESHOLDS = {
    # critical = LLM 原始分90+才触发，high = 75+，避免钓鱼链接等灰色内容误判 critical
    "elder":     {"low": 25, "medium": 50, "high": 70, "critical": 88},
    "student":   {"low": 30, "medium": 55, "high": 72, "critical": 90},
    "financial": {"low": 40, "medium": 60, "high": 78, "critical": 92},
    "adult":     {"low": 40, "medium": 60, "high": 78, "critical": 92},
}


class PersonalizedRiskEvaluator:
    def evaluate(self, base_score: float, similar_cases: list, user_profile: UserProfile):
        # 案例加成完全移除：知识库案例仅作展示参考，不参与评分
        # 防止全诈骗案例库导致所有文本都被推高
        case_bonus = 0.0

        # 历史加成保留但极小：最多 +5，只是轻微提醒
        history_bonus = min(len(user_profile.risk_history) * 1, 5)
        final_score = min(
            (base_score + case_bonus + history_bonus) * user_profile.sensitivity_boost,
            100
        )

        thresholds = ROLE_THRESHOLDS.get(user_profile.role, ROLE_THRESHOLDS["adult"])
        if final_score >= thresholds["critical"]:
            level = RiskLevel.CRITICAL
        elif final_score >= thresholds["high"]:
            level = RiskLevel.HIGH
        elif final_score >= thresholds["medium"]:
            level = RiskLevel.MEDIUM
        elif final_score >= thresholds["low"]:
            level = RiskLevel.LOW
        else:
            level = RiskLevel.SAFE

        print(
            f"[RiskEval] 基础分={base_score:.1f} 案例加成={case_bonus:.1f} "
            f"历史加成={history_bonus:.1f} 最终={final_score:.1f} "
            f"角色={user_profile.role} 等级={level.value}"
        )
        return level, round(final_score / 100, 3)


class DecisionEngine:
    def __init__(self):
        api_key = os.getenv("DASHSCOPE_API_KEY", "")
        self.llm_client = OpenAI(
            api_key=api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
        self.intent_recognizer = IntentRecognizer(self.llm_client)
        self.kb_retriever = KnowledgeBaseRetriever()
        self.risk_evaluator = PersonalizedRiskEvaluator()

    def analyze(self, modal_input: MultimodalInput, user_profile: UserProfile) -> DecisionResult:
        intent_result = self.intent_recognizer.analyze(modal_input)
        query = f"{intent_result.get('intent', '')} {modal_input.text or ''}"
        similar_cases = self.kb_retriever.search(query)
        base_score = intent_result.get("suspicion_score", 0)
        risk_level, confidence = self.risk_evaluator.evaluate(base_score, similar_cases, user_profile)

        fraud_type_str = intent_result.get("fraud_type", "未知类型")
        try:
            fraud_type = FraudType(fraud_type_str)
        except ValueError:
            fraud_type = FraudType.UNKNOWN

        explanation = self._build_explanation(intent_result, similar_cases, risk_level, user_profile)
        return DecisionResult(
            risk_level=risk_level, fraud_type=fraud_type, confidence=confidence,
            intent=intent_result.get("intent", ""), evidence=intent_result.get("evidence", []),
            similar_cases=similar_cases, explanation=explanation, raw_score=base_score,
        )

    def _build_explanation(self, intent: dict, cases: list, level: RiskLevel, profile: UserProfile) -> str:
        parts = [f"检测意图：{intent.get('intent', '未知')}。"]
        if intent.get("evidence"):
            parts.append(f"发现关键证据：{'、'.join(intent['evidence'])}。")
        if cases and cases[0]["similarity"] > 0.3:
            parts.append(
                f"与历史案例「{cases[0]['summary'][:30]}...」"
                f"高度相似（相似度 {cases[0]['similarity']}）。"
            )
        elif cases:
            parts.append(f"未找到高度匹配案例（最高相似度 {cases[0]['similarity']}）。")
        role_label = {
            "elder": "老年人", "student": "学生",
            "financial": "财会人员", "adult": "普通成人",
        }.get(profile.role, profile.role)
        parts.append(f"基于用户角色「{role_label}」综合评估，风险等级为【{level.value}】。")
        return "".join(parts)


from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/decision", tags=["模块02-智能识别决策"])
engine = DecisionEngine()


class AnalyzeRequest(BaseModel):
    text: Optional[str] = None
    image_b64: Optional[str] = None
    audio_text: Optional[str] = None
    source_type: str = "text"
    user_id: str = "default"
    user_role: str = "adult"


@router.post("/analyze")
async def analyze(req: AnalyzeRequest):
    modal_input = MultimodalInput(
        text=req.text, image_b64=req.image_b64,
        audio_text=req.audio_text, source_type=req.source_type,
    )
    profile = UserProfile(user_id=req.user_id, role=req.user_role)
    result = engine.analyze(modal_input, profile)
    return JSONResponse({
        "risk_level": result.risk_level.value, "fraud_type": result.fraud_type.value,
        "confidence": result.confidence, "intent": result.intent,
        "evidence": result.evidence, "similar_cases": result.similar_cases,
        "explanation": result.explanation, "raw_score": result.raw_score,
    })