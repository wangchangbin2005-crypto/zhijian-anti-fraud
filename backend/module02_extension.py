"""
模块02扩展：优化系统提示词 + 对话历史存储 + 多轮上下文 + 个性化风险评估
替换原 module02 中的 INTENT_SYSTEM_PROMPT 和 IntentRecognizer

优化记录：
- 系统提示词精简（1038字→289字），减少约40% token
- 历史轮数 3→1，减少注入上下文
- 纯文本模型换为 qwen3-turbo（更快）
- 图片模态自动切换 qwen3-vl-flash（最快VLM，针对安防/识别场景优化）
- 图片专用系统提示，强制LLM读取图片文字内容
- 进程内 LRU 结果缓存（纯文本相同内容命中直接返回）
- max_tokens 256→180（JSON输出格式固定，不需要更多）
"""

import json
import os
import sqlite3
from datetime import datetime
from typing import Optional


# ─────────────────────────────────────────────
# ① 精简系统提示词
# ─────────────────────────────────────────────

OPTIMIZED_SYSTEM_PROMPT = """你是反诈骗分析专家。只输出JSON，禁止输出其他内容。
类型：AI合成语音诈骗|投资理财诈骗|兼职刷单诈骗|虚假征信诈骗|冒充公检法诈骗|情感诈骗|虚假购物诈骗|虚假贷款诈骗|虚假中奖诈骗|网络游戏诈骗|无诈骗|未知类型
格式：{"intent":"<10字内>","is_suspicious":<bool>,"fraud_type":"<类型>","evidence":["词"],"suspicion_score":<0-100>}
规则：日常对话score=0；转账/充值/安全账户/垫付/保证金才高分。
"""

# 图片模态专用系统提示（指导VLM读图）
IMAGE_SYSTEM_PROMPT = """你是反诈骗分析专家。只输出JSON，禁止输出其他内容。
类型：AI合成语音诈骗|投资理财诈骗|兼职刷单诈骗|虚假征信诈骗|冒充公检法诈骗|情感诈骗|虚假购物诈骗|虚假贷款诈骗|虚假中奖诈骗|网络游戏诈骗|无诈骗|未知类型
格式：{"intent":"<10字内>","is_suspicious":<bool>,"fraud_type":"<类型>","evidence":["词"],"suspicion_score":<0-100>}
规则：日常对话score=0；转账/充值/安全账户/垫付/保证金才高分。

图片分析指令（必须执行）：
1. 仔细识别并阅读图片中所有文字，包括截图、聊天记录、短信、广告图
2. 提取图片中的关键信息：金额、账号、链接、二维码、承诺收益、官方机构名称
3. 将图片文字内容当作对话内容进行诈骗检测
4. 图片中出现充值/转账/链接/高回报/内部福利等词汇时必须重点关注
5. 图片包含可疑短链接（非知名域名）时，evidence中必须标注
"""


# ─────────────────────────────────────────────
# ② 个性化风险配置
# ─────────────────────────────────────────────

ROLE_SCORE_BOOST = {
    # 角色加成降低，避免老人/学生所有对话都被推到 critical
    "elder":     10,   # 原20→10
    "student":    5,   # 原10→5
    "adult":      0,
    "financial":  3,   # 原5→3
}

ROLE_CONTEXT = {
    "elder": (
        "【用户画像：老年人】\n"
        "该用户为老年人，认知防范能力较弱，是电信诈骗的高发群体。\n"
        "请对以下类型保持极高警惕：冒充公检法、AI合成语音、虚假征信、情感诈骗。\n"
        "即使措辞较为温和，只要涉及转账、汇款、安全账户等关键词，suspicion_score 应至少 +15。\n"
    ),
    "student": (
        "【用户画像：学生】\n"
        "该用户为在校学生，社会经验较少，容易受兼职、刷单、情感、冒充学校/助学金类诈骗影响。\n"
        "请重点关注：兼职刷单、虚假助学金、网络情感诈骗。\n"
        "涉及'兼职''刷单''先垫付''助学金''奖学金'等词汇时，suspicion_score 应至少 +10。\n"
    ),
    "financial": (
        "【用户画像：财会人员】\n"
        "该用户为财务/会计人员，是冒充老板/领导指令转账诈骗的高危目标。\n"
        "请重点关注：冒充领导紧急转账、虚假公文、伪造合同付款指令。\n"
        "涉及'领导''老板''紧急付款''保密''对公账户'等词汇时，suspicion_score 应至少 +10。\n"
    ),
    "adult": "",
}


def build_role_aware_prompt(user_role: str, base_text: str, risk_history: list) -> str:
    role_ctx = ROLE_CONTEXT.get(user_role, "")
    history_hint = ""
    if risk_history:
        history_hint = f"\n[系统提示：该用户近期有 {len(risk_history)} 次风险记录，请提高警惕]"
    parts = []
    if role_ctx:
        parts.append(role_ctx)
    parts.append(f"对话内容：\n{base_text}")
    if history_hint:
        parts.append(history_hint)
    return "\n".join(parts)


def apply_role_score_boost(score: int, user_role: str) -> int:
    boost = ROLE_SCORE_BOOST.get(user_role, 0)
    return min(100, score + boost)


# ─────────────────────────────────────────────
# ③ 对话历史存储（SQLite 持久化）
# ─────────────────────────────────────────────

class ConversationHistoryDB:
    """使用 SQLite 存储多轮对话历史"""

    def __init__(self, db_path: str = "./conversation_history.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    risk_level TEXT DEFAULT 'safe',
                    fraud_type TEXT DEFAULT '',
                    timestamp TEXT NOT NULL
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_session ON conversations(session_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_user ON conversations(user_id)")

    def add_message(self, session_id, user_id, role, content, risk_level="safe", fraud_type=""):
        timestamp = datetime.now().isoformat()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO conversations (session_id, user_id, role, content, risk_level, fraud_type, timestamp) VALUES (?,?,?,?,?,?,?)",
                (session_id, user_id, role, content, risk_level, fraud_type, timestamp),
            )

    def get_session_history(self, session_id: str, max_turns: int = 5) -> list[dict]:
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                "SELECT role, content, risk_level, fraud_type, timestamp FROM conversations WHERE session_id=? ORDER BY id DESC LIMIT ?",
                (session_id, max_turns * 2),
            ).fetchall()
        return [
            {"role": r[0], "content": r[1], "risk_level": r[2], "fraud_type": r[3], "timestamp": r[4]}
            for r in reversed(rows)
        ]

    def get_user_risk_history(self, user_id: str) -> list[dict]:
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                "SELECT risk_level, fraud_type, timestamp FROM conversations WHERE user_id=? AND risk_level NOT IN ('safe','low') ORDER BY id DESC LIMIT 20",
                (user_id,),
            ).fetchall()
        return [{"risk_level": r[0], "fraud_type": r[1], "timestamp": r[2]} for r in rows]

    def get_all_sessions(self, user_id: str) -> list[dict]:
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                """SELECT session_id, MAX(timestamp) as last_time, COUNT(*) as msg_count,
                   MAX(CASE WHEN risk_level='critical' THEN 4 WHEN risk_level='high' THEN 3
                            WHEN risk_level='medium' THEN 2 WHEN risk_level='low' THEN 1 ELSE 0 END) as max_risk
                   FROM conversations WHERE user_id=? GROUP BY session_id ORDER BY last_time DESC LIMIT 50""",
                (user_id,),
            ).fetchall()
        risk_map = {0: "safe", 1: "low", 2: "medium", 3: "high", 4: "critical"}
        return [
            {"session_id": r[0], "last_time": r[1], "msg_count": r[2], "max_risk": risk_map.get(r[3], "safe")}
            for r in rows
        ]

    def update_risk_level(self, session_id: str, user_id: str, risk_level: str):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """UPDATE conversations SET risk_level=?
                   WHERE id=(SELECT MAX(id) FROM conversations
                   WHERE session_id=? AND user_id=? AND role='user')""",
                (risk_level, session_id, user_id),
            )

    def delete_session(self, session_id: str) -> int:
        with sqlite3.connect(self.db_path) as conn:
            cur = conn.execute("DELETE FROM conversations WHERE session_id=?", (session_id,))
            return cur.rowcount

    def delete_all_sessions(self, user_id: str) -> int:
        with sqlite3.connect(self.db_path) as conn:
            cur = conn.execute("DELETE FROM conversations WHERE user_id=?", (user_id,))
            return cur.rowcount


# ─────────────────────────────────────────────
# ④ 多轮上下文 + 个性化风险 + VLM自动切换 + 缓存
# ─────────────────────────────────────────────

# ── DeepSeek 客户端（纯文本专用，速度远快于 DashScope）────────
# 使用硅基流动中转，兼容 OpenAI 接口，免费额度充足
# 申请地址：https://cloud.siliconflow.cn  获取 API Key 后填入下方
_SILICONFLOW_KEY = os.getenv("SILICONFLOW_API_KEY", "")   # 填你的硅基流动 key
_DASHSCOPE_KEY   = os.getenv("DASHSCOPE_API_KEY", "")

def _make_deepseek_client():
    """创建 DeepSeek 文本客户端（走硅基流动）"""
    from openai import OpenAI as _OAI
    if _SILICONFLOW_KEY:
        return _OAI(
            api_key=_SILICONFLOW_KEY,
            base_url="https://api.siliconflow.cn/v1",
        )
    # 没有配置硅基流动 key，降级用 DashScope
    print("[Recognizer] 未配置 SILICONFLOW_API_KEY，降级使用 DashScope")
    return None

def _make_dashscope_client():
    """创建 DashScope VLM 客户端（图片专用）"""
    from openai import OpenAI as _OAI
    return _OAI(
        api_key=_DASHSCOPE_KEY,
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    )


class MultiTurnIntentRecognizer:
    # 进程内 LRU 缓存（纯文本相同内容命中直接返回，跳过LLM）
    _cache: dict = {}
    _CACHE_MAX = 200

    # 纯文本走 DeepSeek（快），图片走 DashScope VLM（有视觉能力）
    TEXT_MODEL         = "deepseek-ai/DeepSeek-V3"  # 硅基流动模型名
    TEXT_MODEL_DASHSCOPE = "qwen-turbo"              # DashScope 降级模型名
    VLM_MODEL          = "qwen3-vl-flash"            # DashScope 最快 VLM

    # 延迟初始化，避免启动时报错
    _deepseek_client = None
    _dashscope_client = None

    def __init__(self, client, model: str = None):
        # client 参数保留兼容旧调用（DashScope client）
        self._fallback_client = client
        self.model = model or self.TEXT_MODEL
        self.history_db = ConversationHistoryDB()

    def _get_text_client(self):
        """获取纯文本 client（DeepSeek 优先）"""
        if MultiTurnIntentRecognizer._deepseek_client is None:
            MultiTurnIntentRecognizer._deepseek_client = _make_deepseek_client()
        return MultiTurnIntentRecognizer._deepseek_client or self._fallback_client

    def _get_vlm_client(self):
        """获取 VLM client（DashScope）"""
        if MultiTurnIntentRecognizer._dashscope_client is None:
            MultiTurnIntentRecognizer._dashscope_client = _make_dashscope_client()
        return MultiTurnIntentRecognizer._dashscope_client

    def analyze(self, text: str, session_id: str, user_id: str,
                user_role: str = "adult", image_b64: Optional[str] = None) -> dict:

        # ── 缓存命中：纯文本且无图片，相同内容直接返回 ─────────
        import hashlib
        if not image_b64:
            cache_key = hashlib.md5(f"{text}|{user_role}".encode()).hexdigest()
            if cache_key in MultiTurnIntentRecognizer._cache:
                print(f"[Cache] ⚡ 命中缓存，跳过LLM")
                return MultiTurnIntentRecognizer._cache[cache_key]
        else:
            cache_key = None

        # ── 有图片用 VLM(DashScope)，无图片用 DeepSeek(硅基流动) ─
        if image_b64:
            use_client    = self._get_vlm_client()
            use_model     = self.VLM_MODEL
            system_prompt = IMAGE_SYSTEM_PROMPT
        else:
            use_client    = self._get_text_client()
            use_model     = self.TEXT_MODEL
            system_prompt = OPTIMIZED_SYSTEM_PROMPT
        print(f"[Recognizer] 模型={use_model}，图片={'有' if image_b64 else '无'}")

        messages = [{"role": "system", "content": system_prompt}]

        # 注入历史对话上下文（最近1轮，减少 token）
        history = self.history_db.get_session_history(session_id, max_turns=1)
        for h in history:
            if h["role"] == "user":
                messages.append({"role": "user", "content": h["content"]})

        # 构建角色感知的用户消息
        risk_history  = self.history_db.get_user_risk_history(user_id)
        prompt_text   = text or ("(请分析图片内容，识别其中的诈骗信息)" if image_b64 else "(空输入)")
        enriched_text = build_role_aware_prompt(user_role, prompt_text, risk_history)

        user_content = [{"type": "text", "text": enriched_text}]
        if image_b64:
            user_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}
            })
        messages.append({"role": "user", "content": user_content})

        # ── 自动降级：主 client 失败时切回 DashScope ──────────
        def _do_call(client, model):
            return client.chat.completions.create(
                model=model, messages=messages, temperature=0.1, max_tokens=180,
            )

        try:
            response = _do_call(use_client, use_model)
        except Exception as _primary_err:
            err_str = str(_primary_err)
            # 余额不足/认证失败/限额/模型不存在 → 降级 DashScope qwen-turbo
            if any(k in err_str for k in ["insufficient", "403", "401", "404",
                                           "quota", "balance", "not_found", "does not exist"]):
                print(f"[Recognizer] ⚠️ 主 client 失败({err_str[:80]})，降级 DashScope qwen-turbo")
                response = _do_call(self._fallback_client, self.TEXT_MODEL_DASHSCOPE)
            else:
                raise
        raw = response.choices[0].message.content.strip()

        # 清理 markdown 代码块包裹
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        result = json.loads(raw)

        # ── 角色敏感度分数偏移 ───────────────────────────────────
        original_score = result.get("suspicion_score", 0)
        boosted_score  = apply_role_score_boost(original_score, user_role)
        if boosted_score != original_score:
            print(f"[PersonalizedRisk] 角色={user_role}, 原始分={original_score}, 调整后={boosted_score} (+{boosted_score - original_score})")
        result["suspicion_score"] = boosted_score
        result["user_role"] = user_role

        # ── 存储本轮对话 ─────────────────────────────────────────
        self.history_db.add_message(
            session_id=session_id, user_id=user_id, role="user",
            content=text or "", risk_level="safe",
            fraud_type=result.get("fraud_type", ""),
        )

        # ── 写入缓存（仅纯文本，图片不缓存）────────────────────
        if cache_key:
            if len(MultiTurnIntentRecognizer._cache) >= MultiTurnIntentRecognizer._CACHE_MAX:
                keys = list(MultiTurnIntentRecognizer._cache.keys())
                for k in keys[:len(keys) // 2]:
                    del MultiTurnIntentRecognizer._cache[k]
            MultiTurnIntentRecognizer._cache[cache_key] = result

        return result

    def update_risk_level(self, session_id: str, user_id: str, risk_level: str):
        self.history_db.update_risk_level(session_id, user_id, risk_level)


# ─────────────────────────────────────────────
# FastAPI 路由（历史查询 + 删除接口）
# ─────────────────────────────────────────────

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/history", tags=["对话历史"])
history_db = ConversationHistoryDB()

@router.get("/sessions/{user_id}")
async def get_sessions(user_id: str):
    sessions = history_db.get_all_sessions(user_id)
    return JSONResponse({"sessions": sessions})

@router.get("/session/{session_id}")
async def get_session(session_id: str):
    messages = history_db.get_session_history(session_id, max_turns=50)
    return JSONResponse({"messages": messages})

@router.get("/risk/{user_id}")
async def get_risk_history(user_id: str):
    risks = history_db.get_user_risk_history(user_id)
    return JSONResponse({"risk_history": risks, "total": len(risks)})

@router.post("/session/{session_id}/delete")
async def delete_session(session_id: str):
    deleted = history_db.delete_session(session_id)
    if deleted == 0:
        return JSONResponse({"error": "会话不存在或已删除"}, status_code=404)
    return JSONResponse({"ok": True, "deleted_rows": deleted, "session_id": session_id})

@router.post("/sessions/{user_id}/delete")
async def delete_all_sessions(user_id: str):
    deleted = history_db.delete_all_sessions(user_id)
    return JSONResponse({"ok": True, "deleted_rows": deleted, "user_id": user_id})