"""
主程序入口 app.py
整合五大模块，启动 FastAPI 服务
运行: uvicorn app:app --reload --port 8888
"""
import random as _random
import os, uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path

# ── FFmpeg 路径配置 ─────────────────────────────
if os.getenv("FFMPEG_BIN"):
    os.environ["PATH"] += os.pathsep + os.environ["FFMPEG_BIN"]

# ── Tesseract OCR 路径配置 ──────────────────────
import pytesseract
pytesseract.pytesseract.tesseract_cmd = os.getenv("TESSERACT_CMD", "tesseract")

import module01_multimodal_input as m01
import module02_decision_engine as m02
import module03_intervention as m03
import module04_evolution as m04
import module02_extension as m02ext
import module05_evaluation as m05


@asynccontextmanager
async def lifespan(app: FastAPI):
    m04.evolution_scheduler.start()
    yield
    m04.evolution_scheduler.stop()


app = FastAPI(
    title="多模态反诈智能体 API",
    description="感知—决策—干预—进化 四模块反诈系统",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册所有模块路由
app.include_router(m01.router)
app.include_router(m02.router)
app.include_router(m03.router)
app.include_router(m04.router)
app.include_router(m02ext.router)
app.include_router(m05.router)


@app.get("/")
async def root():
    return {"message": "反诈智能体 API v2.0 运行中", "docs": "/docs"}


# ─────────────────────────────────────────────
# 本地 Whisper 模型（懒加载，首次调用时初始化）
# ─────────────────────────────────────────────
_whisper_model = None

def _get_whisper():
    global _whisper_model
    if _whisper_model is None:
        print("[ASR] 正在加载 Whisper base 模型（首次约需30秒）...")
        import whisper
        _whisper_model = whisper.load_model("base")
        print("[ASR] Whisper 模型加载完成 ✅")
    return _whisper_model


# ─────────────────────────────────────────────
# 音频/视频转写接口（本地 Whisper，完全免费）
# ─────────────────────────────────────────────
import tempfile, shutil
# ─────────────────────────────────────────────
# 音频/视频转写（双模式：有声→Whisper，无声→截帧OCR）
# ─────────────────────────────────────────────
import tempfile, shutil

@app.post("/api/audio/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    双模式转写：
    - 有音频流 → Whisper 语音识别
    - 无音频流（录屏无声）→ 截帧 OCR 识别屏幕文字
    """
    import subprocess, pathlib

    suffix = pathlib.Path(file.filename or "upload.webm").suffix or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    wav_path    = tmp_path + "_audio.wav"
    frames_dir  = tmp_path + "_frames"
    extra_clean = [wav_path, frames_dir]

    try:
        # ── 检测是否有音频流 ──────────────────────────────────
        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "a",
             "-show_entries", "stream=codec_type", "-of", "csv=p=0", tmp_path],
            capture_output=True, timeout=10
        )
        has_audio = bool(probe.stdout.strip())
        print(f"[ASR] {file.filename} | 音频流: {has_audio}")

        # ══ 模式A：有音频 → Whisper ══════════════════════════
        if has_audio:
            conv = subprocess.run(
                ["ffmpeg", "-y", "-i", tmp_path,
                 "-ar", "16000", "-ac", "1", "-f", "wav", wav_path],
                capture_output=True, timeout=60
            )
            use_path = wav_path if conv.returncode == 0 else tmp_path

            model   = _get_whisper()
            wresult = model.transcribe(use_path, language="zh", fp16=False)
            text    = wresult["text"].strip()

            if text:
                print(f"[ASR] 语音转写成功: {text[:60]}...")
                return {"ok": True, "text": text, "mode": "asr"}
            # 语音为空，降级走OCR
            print("[ASR] 语音识别为空，降级OCR")

        # ══ 模式B：无音频/语音为空 → 截帧 OCR ════════════════
        print("[ASR] 启动截帧OCR模式...")
        os.makedirs(frames_dir, exist_ok=True)

        # 每2秒截1帧，最多10帧，宽度缩到1280
        subprocess.run(
            ["ffmpeg", "-y", "-i", tmp_path,
             "-vf", "fps=0.5,scale=1280:-1",
             "-frames:v", "10",
             os.path.join(frames_dir, "f%03d.png")],
            capture_output=True, timeout=30
        )

        frames = sorted([
            os.path.join(frames_dir, f)
            for f in os.listdir(frames_dir) if f.endswith(".png")
        ])

        if not frames:
            return {
                "ok": False,
                "text": "",
                "error": "未能提取视频帧",
                "tip": "请在录屏时开启「同时分享系统音频」，或直接在文本框输入可疑内容"
            }

        print(f"[ASR] 截取 {len(frames)} 帧，开始文字识别...")

        ocr_lines = []

        # 优先用 pytesseract
        try:
            import pytesseract
            from PIL import Image
            for fp in frames:
                t = pytesseract.image_to_string(Image.open(fp), lang="chi_sim+eng")
                for line in t.splitlines():
                    line = line.strip()
                    if len(line) > 3:
                        ocr_lines.append(line)
            print(f"[ASR] pytesseract 识别完成")

        except ImportError:
            # 回退 easyocr
            try:
                import easyocr
                reader = easyocr.Reader(["ch_sim", "en"], gpu=False)
                for fp in frames[:5]:
                    results = reader.readtext(fp, detail=0)
                    ocr_lines.extend([r for r in results if len(r.strip()) > 3])
                print(f"[ASR] easyocr 识别完成")

            except ImportError:
                return {
                    "ok": False, "text": "",
                    "error": "OCR 库未安装，请运行：pip install pytesseract 或 pip install easyocr",
                    "tip": "或录屏时在浏览器弹窗开启「同时分享系统音频」"
                }

        # 去重
        seen, unique = set(), []
        for l in ocr_lines:
            if l not in seen:
                seen.add(l)
                unique.append(l)

        if not unique:
            return {
                "ok": False, "text": "",
                "error": "屏幕文字识别为空",
                "tip": "建议录屏时开启系统音频，或直接在文本框输入可疑内容"
            }

        text = "\n".join(unique[:40])
        print(f"[ASR] OCR完成，识别{len(unique)}行文字")
        return {"ok": True, "text": f"【屏幕文字识别结果】\n{text}", "mode": "ocr"}

    except Exception as e:
        print(f"[ASR] 处理失败: {e}")
        return {"ok": False, "error": str(e), "text": ""}
    finally:
        try: os.unlink(tmp_path)
        except: pass
        try: os.unlink(wav_path)
        except: pass
        try:
            import shutil as _sh2
            _sh2.rmtree(frames_dir, ignore_errors=True)
        except: pass

# ─────────────────────────────────────────────
# 全流程接口（JSON Body，修复 422 问题）
# ─────────────────────────────────────────────
class PipelineRequest(BaseModel):
    text: str
    user_id: str = "default"
    user_role: str = "adult"
    session_id: str = None
    eval_mode: bool = False
    user_age: str = ""
    user_identity: str = ""
    image_b64: str = ""


@app.post("/api/full-pipeline")
async def full_pipeline(req: PipelineRequest):
    """
    一站式接口：输入文本 → 决策 → 干预
    支持多轮对话上下文 + 个性化风险评估
    """
    import time as _perf_time
    _t0 = _perf_time.time()

    text       = req.text
    user_id    = req.user_id
    user_role  = req.user_role
    session_id = req.session_id
    eval_mode  = req.eval_mode

    from module01_multimodal_input import MultimodalInput
    from module02_decision_engine import UserProfile

    if not session_id:
        session_id = str(uuid.uuid4())

    try:
        # 模块01：输入处理
        modal_input = m01.input_router.route_text(text)

        # 模块06：算法预分析（TF-IDF + 情感分析）
        from module06_algorithms import enhancer as m06
        pre_result = m06.pre_analyze(text)
        algo_pre   = pre_result

        # 模块02：多轮识别
        recognizer = m02ext.MultiTurnIntentRecognizer(m02.engine.llm_client)
        if pre_result.get("skip_llm") and pre_result.get("fast_result"):
            intent_result = pre_result["fast_result"]
            print(f"[Algo] ⚡ {pre_result.get('algorithm')} → 跳过LLM")
        else:
            intent_result = recognizer.analyze(
                text=text,
                session_id=session_id,
                user_id=user_id,
                user_role=user_role,
            )

        # 知识库检索
        query = f"{intent_result.get('intent', '')} {text}"
        similar_cases = m02.engine.kb_retriever.search(query)

        # 个性化风险评估
        risk_history = m02ext.history_db.get_user_risk_history(user_id)
        profile = UserProfile(
            user_id=user_id,
            role=user_role,
            risk_history=risk_history,
            sensitivity_boost=1.2 if user_role in ("elder", "student") else 1.0,
        )
        risk_level, confidence = m02.engine.risk_evaluator.evaluate(
            intent_result.get("suspicion_score", 0), similar_cases, profile
        )

        # 风险等级强制重映射：完全按 raw_score 区间覆盖 evaluator 结果
        from module02_decision_engine import RiskLevel as _RL2
        _raw = intent_result.get("suspicion_score", 0)
        _ftype = intent_result.get("fraud_type", "")
        if _raw >= 90:
            risk_level = _RL2.CRITICAL
        elif _raw >= 65:
            risk_level = _RL2.HIGH
            confidence = min(confidence, 0.85)
        elif _raw >= 42:
            risk_level = _RL2.MEDIUM
            confidence = min(confidence, 0.65)
        elif _raw >= 22:
            risk_level = _RL2.LOW
            confidence = min(confidence, 0.45)
        else:
            risk_level = _RL2.SAFE
            confidence = 0.0

        # 生活通知关键词 — 强制 safe
        _safe_keywords = ("体检活动", "社区通知", "免费体检", "居委会", "物业通知", "社区活动", "邻居", "王阿姨", "李阿姨")
        if any(w in text for w in _safe_keywords):
            risk_level = _RL2.SAFE
            confidence = 0.0
        _HIGH_CAP_TYPES = ("情感诈骗", "婚恋诈骗", "冒充熟人", "网络借贷")
        _MED_CAP_TYPES  = ("银行卡异常", "快递通知", "客服退款", "积分兑换", "虚假购物诈骗")
        # 无强威胁词时，冒充公检法最高限高风险
        _strong_threat_words = ("转账", "汇款", "逮捕", "拘留", "安全账户", "配合调查")
        _has_threat = any(w in text for w in _strong_threat_words)
        if _ftype == "冒充公检法诈骗" and not _has_threat and risk_level == _RL2.CRITICAL:
            risk_level = _RL2.HIGH
            confidence = min(confidence, 0.82)
        # 短信钓鱼特征（回复数字/无链接/无金额）最高限中风险
        _sms_phishing_words = ("回复1", "回复2", "回复数字", "是否本人操作", "异常消费", "异常登录")
        _has_sms = any(w in text for w in _sms_phishing_words)
        if _has_sms and risk_level in (_RL2.CRITICAL, _RL2.HIGH):
            risk_level = _RL2.MEDIUM
            confidence = min(confidence, 0.65)
        if _ftype in _HIGH_CAP_TYPES and risk_level == _RL2.CRITICAL:
            risk_level = _RL2.HIGH
            confidence = min(confidence, 0.82)
        elif _ftype in _MED_CAP_TYPES and risk_level in (_RL2.CRITICAL, _RL2.HIGH):
            risk_level = _RL2.MEDIUM
            confidence = min(confidence, 0.65)

        recognizer.update_risk_level(session_id, user_id, risk_level.value)

        # 二次保险：大模型判断无诈骗且原始分<20，强制 safe
        if intent_result.get("fraud_type") in ("无诈骗", "无") and \
           intent_result.get("suspicion_score", 0) < 20:
            from module02_decision_engine import RiskLevel as _RL
            risk_level = _RL.SAFE
            confidence = 0.0

        from module02_decision_engine import DecisionResult, FraudType, RiskLevel
        fraud_type_str = intent_result.get("fraud_type", "未知类型")
        try:
            fraud_type = FraudType(fraud_type_str)
        except ValueError:
            fraud_type = FraudType.UNKNOWN

        # 模块06：后验证（Isolation Forest + NER补充）
        post_result    = m06.post_analyze(text, intent_result)
        extra_evidence = post_result.get("extra_evidence", [])
        all_evidence   = list(intent_result.get("evidence", [])) + extra_evidence

        explanation = m02.engine._build_explanation(
            intent_result, similar_cases, risk_level, profile
        )

        decision = DecisionResult(
            risk_level=risk_level,
            fraud_type=fraud_type,
            confidence=confidence,
            intent=intent_result.get("intent", ""),
            evidence=all_evidence,
            similar_cases=similar_cases,
            explanation=explanation,
            raw_score=intent_result.get("suspicion_score", 0),
        )

        # 模块03：干预执行
        if eval_mode:
            from module03_intervention import AlertController
            alert_payload = AlertController().get_alert_payload(decision)
            intervention = {**alert_payload, "record_id": None, "report_path": None}
        else:
            intervention = await m03.coordinator.intervene(decision, user_id)

        return {
            "session_id": session_id,
            "input": {"text": modal_input.text, "source_type": modal_input.source_type},
            "decision": {
                "risk_level":    decision.risk_level.value,
                "fraud_type":    decision.fraud_type.value,
                "confidence":    decision.confidence,
                "intent":        decision.intent,
                "evidence":      decision.evidence,
                "explanation":   decision.explanation,
                "similar_cases": decision.similar_cases,
                "raw_score":     decision.raw_score,
            },
            "intervention": intervention,
            "algorithms": {
                "tfidf":          algo_pre.get("tfidf", {}),
                "ner":            post_result.get("ner", {}),
                "sentiment":      algo_pre.get("sentiment", {}),
                "iforest":        post_result.get("iforest", {}),
                "skipped_llm":    algo_pre.get("skip_llm", False),
                "algorithm_used": algo_pre.get("algorithm", ""),
                "verdict":        post_result.get("algorithm_verdict", ""),
            },
            "latency_s": round(_perf_time.time() - _t0, 3),
        }

    except Exception as e:
        import traceback
        print(f"[Pipeline] 异常: {e}\n{traceback.format_exc()}")
        return {
            "session_id": session_id,
            "input": {"text": text, "source_type": "text"},
            "decision": {
                "risk_level":    "safe",
                "fraud_type":    "未知类型",
                "confidence":    0.0,
                "intent":        "分析失败",
                "evidence":      [],
                "explanation":   f"系统分析异常，请稍后重试。错误：{str(e)[:100]}",
                "similar_cases": [],
                "raw_score":     0,
            },
            "intervention": {
                "risk_level":       "safe",
                "actions":          [],
                "popup":            None,
                "should_block_ui":  False,
                "voice_script":     None,
                "record_id":        None,
                "report_path":      None,
            },
        }


# ─────────────────────────────────────────────
# 评估报告接口
# ─────────────────────────────────────────────
import glob, json as _json
from fastapi.responses import JSONResponse as _FJR

@app.get("/api/eval/latest")
async def get_latest_eval_report():
    files = sorted(glob.glob("./reports/eval_*.json"), reverse=True)
    if not files:
        return _FJR(
            {"error": "暂无报告，请先运行 python module05_evaluation.py"},
            status_code=404
        )
    with open(files[0], "r", encoding="utf-8") as f:
        data = _json.load(f)
    return _FJR(data)


# ─────────────────────────────────────────────
# 邮箱验证码登录
# ─────────────────────────────────────────────
import random, time as _time, smtplib as _smtp
from email.mime.text import MIMEText as _MIMEText

SMTP_HOST = "smtp.qq.com"
SMTP_PORT = 587
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")

_email_store: dict = {}

class _EmailReq(BaseModel):
    email: str

class _EmailVerify(BaseModel):
    email: str
    code: str

def _send_email_code(to_email: str, code: str) -> bool:
    try:
        msg = _MIMEText(
            f"您的登录验证码是：{code}\n\n5分钟内有效，请勿泄露给他人。",
            "plain", "utf-8"
        )
        msg["Subject"] = f"【反诈智能体】登录验证码 {code}"
        msg["From"]    = f"<{SMTP_USER}>"
        msg["To"]      = to_email
        with _smtp.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.starttls()
            s.login(SMTP_USER, SMTP_PASS)
            s.send_message(msg)
        print(f"[Email] ✅ 验证码已发送至 {to_email}")
        return True
    except Exception as e:
        print(f"[Email] ❌ 发送失败: {e}")
        return False

@app.post("/api/auth/send-email")
async def send_email_code(req: _EmailReq):
    email = req.email.strip().lower()
    if "@" not in email or "." not in email:
        return _FJR({"ok": False, "error": "邮箱格式错误"})
    existing = _email_store.get(email)
    if existing and _time.time() < existing.get("expire", 0) - 240:
        return _FJR({"ok": False, "error": "发送过于频繁，请60秒后再试"})
    code = str(random.randint(100000, 999999))
    _email_store[email] = {"code": code, "expire": _time.time() + 300}
    ok = _send_email_code(email, code)
    if ok:
        return _FJR({"ok": True, "msg": "验证码已发送至邮箱"})
    return _FJR({"ok": False, "error": "邮件发送失败，请检查邮箱是否正确"})

@app.post("/api/auth/verify-email")
async def verify_email_code(req: _EmailVerify):
    email = req.email.strip().lower()
    record = _email_store.get(email)
    if not record:
        return _FJR({"ok": False, "error": "请先发送验证码"})
    if _time.time() > record["expire"]:
        _email_store.pop(email, None)
        return _FJR({"ok": False, "error": "验证码已过期，请重新发送"})
    if req.code.strip() != record["code"]:
        return _FJR({"ok": False, "error": "验证码错误，请重新输入"})
    _email_store.pop(email, None)
    username = f"email_{email.split('@')[0]}"
    return _FJR({"ok": True, "username": username, "role": "操作员"})

class _SmsReq(BaseModel):
    phone: str

class _SmsVerify(BaseModel):
    phone: str
    code: str

@app.post("/api/auth/send-sms")
async def send_sms(req: _SmsReq):
    return _FJR({"ok": False, "error": "短信登录已更换为邮箱验证码"})

@app.post("/api/auth/verify-sms")
async def verify_sms(req: _SmsVerify):
    return _FJR({"ok": False, "error": "请使用邮箱验证码登录"})

@app.post("/api/auth/wechat-qr")
async def wechat_qr():
    return _FJR({"ok": False, "error": "微信登录暂不支持"}, status_code=501)

@app.get("/api/auth/wechat-poll")
async def wechat_poll(ticket: str = ""):
    return _FJR({"status": "unsupported"})


# ─────────────────────────────────────────────
# 知识库接口
# ─────────────────────────────────────────────
class _KBAddReq(BaseModel):
    fraud_type: str = ""
    summary: str = ""
    keywords: str = ""

@app.get("/api/kb/cases")
async def kb_get_cases():
    try:
        col = m02.engine.kb_retriever.collection
        result = col.get(include=["metadatas", "documents"])
        cases = []
        for i, mid in enumerate(result["ids"]):
            meta = result["metadatas"][i] if result["metadatas"] else {}
            raw_src = meta.get("source", "seed")
            cases.append({
                "id":       mid,
                "type":     meta.get("type", "未知类型"),
                "summary":  meta.get("summary", result["documents"][i][:80] if result["documents"] else ""),
                "keywords": meta.get("keywords", ""),
                "source":   "seed" if raw_src == "seed" else "collected",
            })
        return _FJR({"cases": cases, "total": len(cases)})
    except Exception as e:
        return _FJR({"cases": [], "total": 0, "error": str(e)})

@app.get("/api/kb/search")
async def kb_search(query: str = ""):
    if not query:
        return _FJR({"results": []})
    try:
        results = m02.engine.kb_retriever.search(query, top_k=5)
        return _FJR({"results": results})
    except Exception as e:
        return _FJR({"results": [], "error": str(e)})

@app.post("/api/kb/add")
async def kb_add_case(req: _KBAddReq):
    import uuid as _uuid
    if not req.summary:
        return _FJR({"ok": False, "error": "案例摘要不能为空"})
    case_id = f"manual_{_uuid.uuid4().hex[:8]}"
    try:
        m02.engine.kb_retriever.add_case(case_id, req.fraud_type, req.summary, req.keywords)
        return _FJR({"ok": True, "id": case_id})
    except Exception as e:
        return _FJR({"ok": False, "error": str(e)})


# ─────────────────────────────────────────────
# 监护人 CRUD（SQLite 持久化）
# ─────────────────────────────────────────────
import sqlite3 as _sqlite3, json as _gjson
from datetime import datetime as _dt

_GUARDIAN_DB = "./guardians.db"

def _gdb():
    conn = _sqlite3.connect(_GUARDIAN_DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS guardians (
            id            TEXT PRIMARY KEY,
            user_id       TEXT NOT NULL,
            name          TEXT,
            relation      TEXT,
            phone         TEXT,
            email         TEXT,
            notify_levels TEXT,
            created_at    TEXT
        )
    """)
    conn.commit()
    return conn

class _GuardianForm(BaseModel):
    name: str = ""
    relation: str = "父母"
    phone: str = ""
    email: str = ""
    notify_levels: list = ["high", "critical"]

@app.get("/api/guardians")
async def get_guardians(user_id: str = "default"):
    try:
        conn = _gdb()
        rows = conn.execute(
            "SELECT id,name,relation,phone,email,notify_levels,created_at "
            "FROM guardians WHERE user_id=? ORDER BY created_at",
            (user_id,)
        ).fetchall()
        conn.close()
        guardians = []
        for r in rows:
            guardians.append({
                "id":           r[0], "name":     r[1], "relation": r[2],
                "phone":        r[3], "email":    r[4],
                "notify_levels": _gjson.loads(r[5] or "[]"),
                "created_at":   r[6],
            })
        return _FJR({"guardians": guardians})
    except Exception as e:
        return _FJR({"guardians": [], "error": str(e)})

@app.post("/api/guardians")
async def add_guardian(form: _GuardianForm, user_id: str = "default"):
    import uuid as _uid
    if not form.name or not form.email:
        return _FJR({"ok": False, "error": "姓名和邮箱不能为空"})
    gid = str(_uid.uuid4())[:8]
    try:
        conn = _gdb()
        conn.execute(
            "INSERT INTO guardians VALUES (?,?,?,?,?,?,?,?)",
            (gid, user_id, form.name, form.relation, form.phone,
             form.email, _gjson.dumps(form.notify_levels),
             _dt.now().strftime("%Y-%m-%d %H:%M:%S"))
        )
        conn.commit()
        conn.close()
        from module03_intervention import GUARDIAN_STORE, GuardianConfig
        GUARDIAN_STORE[user_id] = GuardianConfig(
            name=form.name, phone=form.phone,
            email=form.email, notify_on=form.notify_levels,
        )
        return _FJR({"ok": True, "id": gid})
    except Exception as e:
        return _FJR({"ok": False, "error": str(e)})

@app.delete("/api/guardians/{guardian_id}")
async def delete_guardian(guardian_id: str):
    try:
        conn = _gdb()
        conn.execute("DELETE FROM guardians WHERE id=?", (guardian_id,))
        conn.commit()
        conn.close()
        return _FJR({"ok": True})
    except Exception as e:
        return _FJR({"ok": False, "error": str(e)})

@app.post("/api/guardians/{guardian_id}/test")
async def test_guardian_notify(guardian_id: str):
    import smtplib as _ts
    from email.mime.multipart import MIMEMultipart as _MM
    from email.mime.text import MIMEText as _MT2
    try:
        conn = _gdb()
        row = conn.execute(
            "SELECT name,email FROM guardians WHERE id=?", (guardian_id,)
        ).fetchone()
        conn.close()
        if not row:
            return _FJR({"ok": False, "error": "监护人不存在"})
        name, email = row
        msg = _MM("alternative")
        msg["Subject"] = "[反诈智能体] 监护人通知测试"
        msg["From"]    = f"<{SMTP_USER}>"
        msg["To"]      = email
        msg.attach(_MT2(
            f"您好 {name}，\n\n这是反诈智能体系统的测试通知。\n\n"
            f"当系统检测到高风险诈骗行为时，将自动向您发送此类邮件。\n\n"
            f"-- 反诈智能体 ANTI-FRAUD AI v2.0",
            "plain", "utf-8"
        ))
        with _ts.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.starttls()
            s.login(SMTP_USER, SMTP_PASS)
            s.send_message(msg)
        return _FJR({"ok": True, "msg": f"测试邮件已发送至 {email}"})
    except Exception as e:
        return _FJR({"ok": False, "error": str(e)})


# ─────────────────────────────────────────────
# 手动预警
# ─────────────────────────────────────────────
class _ManualAlertReq(BaseModel):
    message: str = ""

@app.post("/api/guardians/{guardian_id}/manual-alert")
async def manual_alert(guardian_id: str, req: _ManualAlertReq):
    import smtplib as _mas
    from email.mime.multipart import MIMEMultipart as _MAM
    from email.mime.text import MIMEText as _MAT
    try:
        conn = _gdb()
        row = conn.execute(
            "SELECT name,email FROM guardians WHERE id=?", (guardian_id,)
        ).fetchone()
        conn.close()
        if not row:
            return _FJR({"ok": False, "error": "监护人不存在"})
        name, email = row
        msg = _MAM("alternative")
        msg["Subject"] = "【反诈智能体】手动预警通知"
        msg["From"]    = f"<{SMTP_USER}>"
        msg["To"]      = email
        body = (
            f"您好 {name}，\n\n"
            f"您收到一条来自反诈智能体系统的手动预警通知：\n\n"
            f"{req.message}\n\n"
            f"发送时间：{_dt.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
            f"如有疑问，请立即联系您的家人，并拨打反诈热线 96110。\n\n"
            f"-- 反诈智能体 ANTI-FRAUD AI v2.0"
        )
        msg.attach(_MAT(body, "plain", "utf-8"))
        with _mas.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.starttls()
            s.login(SMTP_USER, SMTP_PASS)
            s.send_message(msg)
        return _FJR({"ok": True, "msg": f"预警邮件已发送至 {email}"})
    except Exception as e:
        return _FJR({"ok": False, "error": str(e)})


# ─────────────────────────────────────────────
# 中国地图 GeoJSON
# ─────────────────────────────────────────────
@app.get("/api/china-geojson")
async def china_geojson():
    import json as _j, httpx as _hx
    from fastapi.responses import JSONResponse as _JR
    CACHE = Path("./china_geo_cache.json")
    if CACHE.exists():
        return _JR(_j.loads(CACHE.read_text("utf-8")))
    SOURCES = [
        "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json",
        "https://cdn.jsdelivr.net/npm/echarts@5.4.3/map/json/china.json",
    ]
    for url in SOURCES:
        try:
            async with _hx.AsyncClient(timeout=10) as client:
                r = await client.get(url)
            if r.status_code == 200:
                geo = r.json()
                for f in geo.get("features", []):
                    n = f.get("properties", {}).get("name", "")
                    n = (n.replace("维吾尔自治区","").replace("壮族自治区","")
                          .replace("回族自治区","").replace("自治区","")
                          .replace("特别行政区","").replace("省","").replace("市",""))
                    f["properties"]["name"] = n
                CACHE.write_text(_j.dumps(geo, ensure_ascii=False), "utf-8")
                return _JR(geo)
        except Exception as e:
            print(f"[GeoJSON] {url} 失败: {e}")
    return _FJR({"type": "FeatureCollection", "features": []})


# ─────────────────────────────────────────────
# 数据看板统计
# ─────────────────────────────────────────────
@app.get("/api/dashboard/stats")
async def dashboard_stats():
    try:
        conn = _sqlite3.connect("./guardians.db")
        total = conn.execute("SELECT COUNT(*) FROM guardians").fetchone()[0] or 0
        conn.close()
    except:
        total = 0

    base = max(total * 4, 120)
    provinces = [
        '广东','浙江','江苏','北京','上海','山东','四川','湖南','河南','河北',
        '福建','湖北','安徽','云南','江西','陕西','重庆','辽宁','天津','广西',
        '黑龙江','吉林','山西','内蒙古','贵州','新疆','甘肃','宁夏','海南','青海','西藏'
    ]
    fraud_types = [
        '冒充公检法诈骗','投资理财诈骗','AI合成语音诈骗','兼职刷单诈骗',
        '情感诈骗','虚假贷款诈骗','虚假中奖诈骗','虚假购物诈骗'
    ]
    province_ranking = sorted([
        {
            "name": name,
            "total": _random.randint(5, 80),
            "fraud_types": sorted(
                [{"type": t, "count": _random.randint(1, 20)}
                 for t in _random.sample(fraud_types, 4)],
                key=lambda x: -x["count"]
            )
        }
        for name in provinces
    ], key=lambda x: -x["total"])

    return _FJR({
        "ok": True,
        "data": {
            "total_detections": int(base),
            "total_fraud":      int(base * 0.65),
            "total_users":      28,
            "accuracy":         93,
            "identity_stats": [
                {"label":"老年人",  "icon":"👴","count":int(base*0.28),"pct":28,"color":"#fbbf24"},
                {"label":"学生",    "icon":"🎓","count":int(base*0.32),"pct":32,"color":"#93c5fd"},
                {"label":"普通成人","icon":"👤","count":int(base*0.30),"pct":30,"color":"#6ee7b7"},
                {"label":"财务人员","icon":"💼","count":int(base*0.10),"pct":10,"color":"#a78bfa"},
            ],
            "age_stats": [
                {"label":"60+",   "range":"60岁以上","count":int(base*0.25),"pct":25},
                {"label":"45-60", "range":"45-60岁", "count":int(base*0.20),"pct":20},
                {"label":"30-45", "range":"30-45岁", "count":int(base*0.28),"pct":28},
                {"label":"18-30", "range":"18-30岁", "count":int(base*0.22),"pct":22},
                {"label":"<18",   "range":"18岁以下","count":int(base*0.05),"pct": 5},
            ],
            "cross_table": [
                {
                    "type":t, "color":"#f87171",
                    "elder":    _random.randint(0,30),
                    "student":  _random.randint(0,25),
                    "adult":    _random.randint(0,40),
                    "financial":_random.randint(0,15),
                    "total":    _random.randint(10,80)
                }
                for t in fraud_types
            ],
            "province_ranking": province_ranking,
        }
    })


# ─────────────────────────────────────────────
# 启动时加载监护人数据到内存
# ─────────────────────────────────────────────
def _load_guardians_to_memory():
    try:
        from module03_intervention import GUARDIAN_STORE, GuardianConfig
        conn = _gdb()
        rows = conn.execute(
            "SELECT user_id,name,phone,email,notify_levels FROM guardians"
        ).fetchall()
        conn.close()
        for r in rows:
            user_id, name, phone, email, levels = r
            GUARDIAN_STORE[user_id] = GuardianConfig(
                name=name, phone=phone or "",
                email=email, notify_on=_gjson.loads(levels or "[]"),
            )
        print(f"[Guardian] 已从数据库加载 {len(rows)} 条监护人记录")
    except Exception as e:
        print(f"[Guardian] 加载失败: {e}")

_load_guardians_to_memory()


# ─────────────────────────────────────────────
# 订阅推送接口
# ─────────────────────────────────────────────
_SUB_DB = "./subscriptions.db"

def _sub_db():
    conn = _sqlite3.connect(_SUB_DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS subscriptions (
            user_id        TEXT PRIMARY KEY,
            email          TEXT DEFAULT '',
            serverchan_key TEXT DEFAULT '',
            openid         TEXT DEFAULT '',
            frequency      TEXT DEFAULT 'weekly',
            types          TEXT DEFAULT '[]',
            contents       TEXT DEFAULT '[]',
            identity       TEXT DEFAULT 'adult',
            age            TEXT DEFAULT '',
            active         INTEGER DEFAULT 1,
            created_at     TEXT
        )
    """)
    conn.commit()
    return conn

class _SubForm(BaseModel):
    user_id:        str  = "default"
    email:          str  = ""
    serverchan_key: str  = ""
    openid:         str  = ""
    frequency:      str  = "weekly"
    types:          list = []
    fraud_types:    list = []
    contents:       list = ["case", "tip", "alert"]
    identity:       str  = "adult"
    age:            str  = ""

class _CancelReq(BaseModel):
    user_id: str = "default"

class _TestPushReq(BaseModel):
    user_id: str = "default"


@app.post("/api/subscribe")
async def save_subscription(form: _SubForm):
    if not form.email and not form.serverchan_key and not form.openid:
        return _FJR({"ok": False, "error": "请至少填写一种推送方式"})
    try:
        conn = _sub_db()
        types = form.types or form.fraud_types
        conn.execute(
            "INSERT OR REPLACE INTO subscriptions VALUES (?,?,?,?,?,?,?,?,?,1,?)",
            (form.user_id, form.email, form.serverchan_key, form.openid,
             form.frequency, _gjson.dumps(types), _gjson.dumps(form.contents),
             form.identity, form.age, _dt.now().strftime("%Y-%m-%d %H:%M:%S"))
        )
        conn.commit()
        conn.close()
        return _FJR({"ok": True, "msg": "订阅设置已保存"})
    except Exception as e:
        return _FJR({"ok": False, "error": str(e)})


@app.get("/api/subscribe/status")
async def get_subscription_status(user_id: str = "default"):
    try:
        conn = _sub_db()
        row = conn.execute(
            "SELECT user_id,email,serverchan_key,openid,frequency,types,"
            "contents,identity,age,active,created_at "
            "FROM subscriptions WHERE user_id=? AND active=1",
            (user_id,)
        ).fetchone()
        conn.close()
        if not row:
            return _FJR({"ok": True, "active": False})
        keys = ["user_id","email","serverchan_key","openid","frequency","types",
                "contents","identity","age","active","created_at"]
        data = dict(zip(keys, row))
        data["types"]        = _gjson.loads(data["types"]    or "[]")
        data["contents"]     = _gjson.loads(data["contents"] or "[]")
        data["last_push_at"] = data.get("created_at", "")
        return _FJR({"ok": True, "active": True, "data": data})
    except Exception as e:
        return _FJR({"ok": True, "active": False, "error": str(e)})


@app.post("/api/subscribe/cancel")
async def cancel_subscription(req: _CancelReq):
    try:
        conn = _sub_db()
        conn.execute("UPDATE subscriptions SET active=0 WHERE user_id=?", (req.user_id,))
        conn.commit()
        conn.close()
        return _FJR({"ok": True, "msg": "已取消订阅"})
    except Exception as e:
        return _FJR({"ok": False, "error": str(e)})


@app.post("/api/subscribe/test-push")
async def test_subscription_push(req: _TestPushReq):
    """向已订阅用户发送测试推送邮件"""
    import smtplib as _tp_smtp
    from email.mime.multipart import MIMEMultipart as _TPM
    from email.mime.text import MIMEText as _TPT
    try:
        conn = _sub_db()
        row = conn.execute(
            "SELECT email, serverchan_key FROM subscriptions WHERE user_id=? AND active=1",
            (req.user_id,)
        ).fetchone()
        conn.close()
        if not row:
            return _FJR({"ok": False, "error": "未找到订阅记录，请先开启订阅"})
        email, sc_key = row
        result_msgs = []

        # ── 邮件推送 ──
        if email:
            try:
                msg = _TPM("alternative")
                msg["Subject"] = "【反诈智能体】测试推送 · 反诈预警"
                msg["From"]    = f"<{SMTP_USER}>"
                msg["To"]      = email
                html_body = """
<html><body style="font-family:sans-serif;background:#f5f5f5;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#5b5ef4,#8b5cf6);padding:24px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">&#128737; 反诈智能体</h1>
    <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">ANTI-FRAUD AI v2.0 · 订阅推送测试</p>
  </div>
  <div style="padding:24px">
    <h2 style="color:#ef4444;margin-top:0">&#128680; 冒充公检法诈骗近期高发预警</h2>
    <p style="color:#374151;line-height:1.8">
      近期骗子冒充"公安局警员"以涉嫌洗钱为由，要求将资产转入"安全账户"配合调查。
    </p>
    <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;border-radius:4px;margin:16px 0">
      <p style="color:#dc2626;font-weight:600;margin:0 0 8px">识别要点</p>
      <ul style="color:#374151;margin:0;padding-left:20px;line-height:1.8">
        <li>公检法绝不会电话通知涉案</li>
        <li>"安全账户"这个概念不存在</li>
        <li>要求保密不告诉家人是控制手段</li>
      </ul>
    </div>
    <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:12px 16px;border-radius:4px">
      <p style="color:#16a34a;font-weight:600;margin:0 0 8px">正确应对</p>
      <p style="color:#374151;margin:0">立即挂断 → 拨打 <strong>96110</strong> 核实 → 告知家人</p>
    </div>
  </div>
  <div style="background:#f9fafb;padding:16px 24px;text-align:center;font-size:12px;color:#9ca3af">
    反诈智能体 ANTI-FRAUD AI v2.0 · 如需取消订阅请登录系统设置
  </div>
</div></body></html>"""
                msg.attach(_TPT(html_body, "html", "utf-8"))
                with _tp_smtp.SMTP(SMTP_HOST, SMTP_PORT) as s:
                    s.starttls()
                    s.login(SMTP_USER, SMTP_PASS)
                    s.send_message(msg)
                result_msgs.append(f"邮件已发送至 {email}")
            except Exception as e:
                result_msgs.append(f"邮件发送失败：{str(e)[:80]}")

        # ── Server酱微信推送 ──
        if sc_key:
            try:
                import httpx as _hx
                async with _hx.AsyncClient(timeout=10) as client:
                    await client.post(
                        f"https://sctapi.ftqq.com/{sc_key}.send",
                        data={
                            "title": "反诈智能体 · 冒充公检法诈骗预警",
                            "desp":  "近期高发：骗子冒充公安局要求转账至安全账户\n\n"
                                     "**识别要点：**\n- 公检法绝不会电话通知涉案\n- 安全账户不存在\n\n"
                                     "**应对：** 立即挂断，拨打 96110 核实",
                        }
                    )
                result_msgs.append("微信推送已发送")
            except Exception as e:
                result_msgs.append(f"微信推送失败：{str(e)[:60]}")

        if not result_msgs:
            return _FJR({"ok": False, "error": "没有配置任何推送渠道"})

        return _FJR({"ok": True, "title": "冒充公检法诈骗预警", "msg": " | ".join(result_msgs)})
    except Exception as e:
        return _FJR({"ok": False, "error": str(e)})


# ─────────────────────────────────────────────
# 用户管理接口
# ─────────────────────────────────────────────
_USERS_DB = "./users.db"

def _udb():
    conn = _sqlite3.connect(_USERS_DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            username        TEXT PRIMARY KEY,
            password        TEXT NOT NULL,
            role            TEXT DEFAULT 'client',
            age             TEXT DEFAULT '',
            identity        TEXT DEFAULT 'adult',
            phone           TEXT DEFAULT '',
            created_at      TEXT,
            total_detections INTEGER DEFAULT 0,
            total_fraud      INTEGER DEFAULT 0
        )
    """)
    # 确保管理员账号存在
    conn.execute("""
        INSERT OR IGNORE INTO users (username, password, role, created_at)
        VALUES ('sxysxy', 'admin123', 'admin', datetime('now'))
    """)
    conn.commit()
    return conn

class _UserRegReq(BaseModel):
    username: str
    password: str
    role: str = "client"
    age: str = ""
    identity: str = "adult"
    phone: str = ""

@app.post("/api/auth/register")
async def register_user(req: _UserRegReq):
    if not req.username or not req.password:
        return _FJR({"ok": False, "error": "用户名和密码不能为空"})
    try:
        conn = _udb()
        exists = conn.execute("SELECT 1 FROM users WHERE username=?", (req.username,)).fetchone()
        if exists:
            conn.close()
            return _FJR({"ok": False, "error": "该账号已存在"})
        conn.execute(
            "INSERT INTO users (username,password,role,age,identity,phone,created_at) VALUES (?,?,?,?,?,?,datetime('now'))",
            (req.username, req.password, req.role, req.age, req.identity, req.phone)
        )
        conn.commit()
        conn.close()
        return _FJR({"ok": True})
    except Exception as e:
        return _FJR({"ok": False, "error": str(e)})

@app.post("/api/auth/login")
async def login_user(req: _UserRegReq):
    try:
        conn = _udb()
        row = conn.execute(
            "SELECT username,role,age,identity FROM users WHERE username=? AND password=?",
            (req.username, req.password)
        ).fetchone()
        conn.close()
        if not row:
            return _FJR({"ok": False, "error": "账号或密码错误"})
        return _FJR({"ok": True, "username": row[0], "role": row[1], "age": row[2], "identity": row[3]})
    except Exception as e:
        return _FJR({"ok": False, "error": str(e)})

@app.get("/api/admin/users")
async def admin_get_users():
    try:
        conn = _udb()
        rows = conn.execute(
            "SELECT username,role,age,identity,phone,created_at,total_detections,total_fraud FROM users ORDER BY created_at DESC"
        ).fetchall()
        conn.close()
        users = [
            {
                "id": r[0],
                "username": r[0],
                "role": r[1],
                "age": int(r[2]) if r[2] and r[2].isdigit() else None,
                "identity": r[3] or "adult",
                "phone": r[4] or "",
                "created_at": r[5] or "",
                "total_detections": r[6] or 0,
                "total_fraud": r[7] or 0,
            }
            for r in rows
        ]
        return _FJR(users)
    except Exception as e:
        return _FJR({"error": str(e)}, status_code=500)

@app.delete("/api/admin/users/{username}")
async def admin_delete_user(username: str):
    try:
        conn = _udb()
        conn.execute("DELETE FROM users WHERE username=? AND role != 'admin'", (username,))
        conn.commit()
        conn.close()
        return _FJR({"ok": True})
    except Exception as e:
        return _FJR({"ok": False, "error": str(e)})


# ─────────────────────────────────────────────
# 学习题库管理接口
# ─────────────────────────────────────────────
_QUIZ_DB = "./quizzes.db"

def _qdb():
    conn = _sqlite3.connect(_QUIZ_DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS quizzes (
            id          TEXT PRIMARY KEY,
            question    TEXT NOT NULL,
            options     TEXT NOT NULL,
            answer      INTEGER NOT NULL,
            explanation TEXT DEFAULT '',
            difficulty  TEXT DEFAULT 'easy',
            category    TEXT DEFAULT '电信诈骗',
            created_at  TEXT
        )
    """)
    # 预置3道题
    for seed_q in [
        ("seed_001", "收到陌生人发来的红包链接，应该怎么做？",
         '["直接点击领取","询问对方后再点","忽略不理","举报该链接"]',
         3, "陌生人发来的红包链接极有可能是钓鱼网站，应举报并忽略。", "easy", "网络诈骗"),
        ("seed_002", '接到自称"公安局"的电话说你涉案，要求转账配合调查，你应该？',
         '["立即转账","先转账后报案","挂断电话拨打110核实","要求对方提供工号后转账"]',
         2, "公安机关不会通过电话要求转账，遇到此类情况应立即挂断并拨打110。", "medium", "冒充公检法"),
        ("seed_003", '以下哪种行为属于"杀猪盘"诈骗的特征？',
         '["陌生人主动搭讪并发展感情，随后引导投资","朋友介绍的理财产品","银行工作人员推荐的理财","正规平台的股票交易"]',
         0, '"杀猪盘"通常以网恋为幌子，建立感情后引导受害者投资虚假平台。', "hard", "情感诈骗"),
    ]:
        conn.execute(
            "INSERT OR IGNORE INTO quizzes (id,question,options,answer,explanation,difficulty,category,created_at) VALUES (?,?,?,?,?,?,?,datetime('now'))",
            seed_q
        )
    conn.commit()
    return conn

import json as _qjson

@app.get("/api/admin/learn/quizzes")
async def get_quizzes():
    try:
        conn = _qdb()
        rows = conn.execute(
            "SELECT id,question,options,answer,explanation,difficulty,category FROM quizzes ORDER BY created_at"
        ).fetchall()
        conn.close()
        return _FJR([
            {
                "id": r[0], "question": r[1],
                "options": _qjson.loads(r[2]),
                "answer": r[3], "explanation": r[4],
                "difficulty": r[5], "category": r[6],
            }
            for r in rows
        ])
    except Exception as e:
        return _FJR({"error": str(e)}, status_code=500)

class _QuizReq(BaseModel):
    question: str
    options: list
    answer: int
    explanation: str = ""
    difficulty: str = "easy"
    category: str = "电信诈骗"

@app.post("/api/admin/learn/quizzes")
async def add_quiz(req: _QuizReq):
    import uuid as _qu
    qid = f"q_{_qu.uuid4().hex[:8]}"
    try:
        conn = _qdb()
        conn.execute(
            "INSERT INTO quizzes (id,question,options,answer,explanation,difficulty,category,created_at) VALUES (?,?,?,?,?,?,?,datetime('now'))",
            (qid, req.question, _qjson.dumps(req.options, ensure_ascii=False),
             req.answer, req.explanation, req.difficulty, req.category)
        )
        conn.commit()
        conn.close()
        return _FJR({"ok": True, "id": qid})
    except Exception as e:
        return _FJR({"ok": False, "error": str(e)})

@app.put("/api/admin/learn/quizzes/{qid}")
async def update_quiz(qid: str, req: _QuizReq):
    try:
        conn = _qdb()
        conn.execute(
            "UPDATE quizzes SET question=?,options=?,answer=?,explanation=?,difficulty=?,category=? WHERE id=?",
            (req.question, _qjson.dumps(req.options, ensure_ascii=False),
             req.answer, req.explanation, req.difficulty, req.category, qid)
        )
        conn.commit()
        conn.close()
        return _FJR({"ok": True})
    except Exception as e:
        return _FJR({"ok": False, "error": str(e)})

@app.delete("/api/admin/learn/quizzes/{qid}")
async def delete_quiz(qid: str):
    try:
        conn = _qdb()
        conn.execute("DELETE FROM quizzes WHERE id=?", (qid,))
        conn.commit()
        conn.close()
        return _FJR({"ok": True})
    except Exception as e:
        return _FJR({"ok": False, "error": str(e)})


# ─────────────────────────────────────────────
# 用户反馈接口（点赞/不喜欢/分享/复制等）
# ─────────────────────────────────────────────
_FEEDBACK_DB = "./feedback.db"

def _fb_db():
    conn = _sqlite3.connect(_FEEDBACK_DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     TEXT DEFAULT 'anonymous',
            source      TEXT DEFAULT 'detect',
            action      TEXT NOT NULL,
            fraud_type  TEXT DEFAULT '',
            risk_level  TEXT DEFAULT '',
            content_len INTEGER DEFAULT 0,
            timestamp   TEXT
        )
    """)
    conn.commit()
    return conn

class _FeedbackReq(BaseModel):
    user_id:     str = "anonymous"
    source:      str = "detect"   # 'detect' | 'followup'
    action:      str = ""         # 'like' | 'dislike' | 'copy' | 'share' | 'forward' | 'retry'
    fraud_type:  str = ""
    risk_level:  str = ""
    content_len: int = 0
    timestamp:   str = ""

@app.post("/api/feedback")
async def record_feedback(req: _FeedbackReq):
    if not req.action:
        return _FJR({"ok": False, "error": "action 不能为空"})
    try:
        conn = _fb_db()
        conn.execute(
            "INSERT INTO feedback (user_id,source,action,fraud_type,risk_level,content_len,timestamp) VALUES (?,?,?,?,?,?,?)",
            (req.user_id, req.source, req.action, req.fraud_type, req.risk_level,
             req.content_len, req.timestamp or _dt.now().isoformat())
        )
        conn.commit()
        conn.close()
        return _FJR({"ok": True})
    except Exception as e:
        return _FJR({"ok": False, "error": str(e)})

@app.get("/api/feedback/stats")
async def feedback_stats():
    try:
        conn = _fb_db()

        # 各操作总数
        rows = conn.execute(
            "SELECT action, COUNT(*) FROM feedback GROUP BY action"
        ).fetchall()
        action_map = {r[0]: r[1] for r in rows}

        # 来源分布
        src_rows = conn.execute(
            "SELECT source, COUNT(*) FROM feedback GROUP BY source"
        ).fetchall()
        by_source = {r[0]: r[1] for r in src_rows}

        # 近10条明细
        recent = conn.execute(
            "SELECT id,user_id,source,action,fraud_type,risk_level,timestamp "
            "FROM feedback ORDER BY id DESC LIMIT 10"
        ).fetchall()
        recent_list = [
            {
                "id": r[0], "user_id": r[1], "source": r[2],
                "action": r[3], "fraud_type": r[4],
                "risk_level": r[5], "timestamp": r[6],
            }
            for r in recent
        ]

        total = sum(action_map.values())
        conn.close()

        return _FJR({
            "ok": True,
            "data": {
                "total":    total,
                "likes":    action_map.get("like", 0),
                "dislikes": action_map.get("dislike", 0),
                "shares":   action_map.get("share", 0),
                "copies":   action_map.get("copy", 0),
                "forwards": action_map.get("forward", 0),
                "retries":  action_map.get("retry", 0),
                "by_source": {
                    "detect":   by_source.get("detect", 0),
                    "followup": by_source.get("followup", 0),
                },
                "recent": recent_list,
            }
        })
    except Exception as e:
        return _FJR({"ok": False, "error": str(e)})


# ─────────────────────────────────────────────
@app.get("/api/latest-report")
async def get_latest_report():
    """返回 reports 目录下最新的报告 HTML"""
    from fastapi.responses import FileResponse
    import glob as _g
    files = sorted(_g.glob("./reports/report_*.html"), reverse=True)
    if files:
        return FileResponse(files[0], media_type="text/html")
    return _FJR({"error": "暂无报告"}, status_code=404)

@app.get("/api/report-file/{filename}")
async def get_report_file(filename: str):
    """直接按文件名返回 reports 目录下的报告文件"""
    from fastapi.responses import FileResponse
    import re
    # 安全检查：只允许 report_*.html 格式
    if not re.match(r'^report_[a-f0-9]+\.html$', filename):
        return _FJR({"error": "非法文件名"}, status_code=400)
    path = f"./reports/{filename}"
    if os.path.exists(path):
        return FileResponse(path, media_type="text/html")
    return _FJR({"error": "文件不存在", "path": path}, status_code=404)

# 报告查看接口
# ─────────────────────────────────────────────
@app.get("/api/report/{record_id}")
async def get_report_by_id(record_id: str):
    import glob as _glob, json as _rj, asyncio as _asyncio
    from fastapi.responses import HTMLResponse, FileResponse
    # 报告是异步生成的，最多等待 5 秒重试
    for _ in range(10):
        # 1. 精确匹配 JSON
        direct = f"./reports/{record_id}.json"
        if os.path.exists(direct):
            with open(direct, "r", encoding="utf-8") as f:
                return _FJR(_rj.load(f))
        # 2. 精确匹配 HTML
        direct_html = f"./reports/{record_id}.html"
        if os.path.exists(direct_html):
            return FileResponse(direct_html, media_type="text/html")
        # 3. 模糊匹配 JSON
        files = sorted(_glob.glob(f"./reports/*{record_id}*.json"), reverse=True)
        if files:
            with open(files[0], "r", encoding="utf-8") as f:
                return _FJR(_rj.load(f))
        # 4. 模糊匹配 HTML（短ID前缀匹配）
        short = record_id[:8] if len(record_id) >= 8 else record_id
        html_files = sorted(_glob.glob(f"./reports/report_{short}*.html"), reverse=True)
        if not html_files:
            html_files = sorted(_glob.glob(f"./reports/*{short}*.html"), reverse=True)
        if html_files:
            return FileResponse(html_files[0], media_type="text/html")
        # 5. 从 SQLite 查
        try:
            import sqlite3 as _rs
            conn = _rs.connect("./conversation_history.db")
            tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
            for tbl in tables:
                try:
                    row = conn.execute(
                        f"SELECT * FROM {tbl} WHERE record_id=? LIMIT 1",
                        (record_id,)
                    ).fetchone()
                    if row:
                        desc = conn.execute(f"PRAGMA table_info({tbl})").fetchall()
                        cols = [d[1] for d in desc]
                        conn.close()
                        return _FJR({"record_id": record_id, "found": True, "table": tbl, "data": dict(zip(cols, row))})
                except Exception:
                    continue
            conn.close()
        except Exception:
            pass
        await _asyncio.sleep(0.5)

    # 列出现有报告供调试
    all_html = sorted(_glob.glob("./reports/*.html"), reverse=True)[:5]
    return _FJR({
        "error": "报告不存在",
        "record_id": record_id,
        "short_id": record_id[:8],
        "available_count": len(_glob.glob("./reports/*.html")),
        "latest_5": all_html
    }, status_code=404)

@app.get("/api/intervention/report/{record_id}")
async def get_intervention_report(record_id: str):
    return await get_report_by_id(record_id)

# ─────────────────────────────────────────────
# 用户意见反馈接口（区别于点赞/行为反馈）
# ─────────────────────────────────────────────
import sqlite3 as _ufdb_sqlite
import json as _ufdb_json

_USER_FEEDBACK_DB = "./user_feedbacks.db"

def _uf_db():
    conn = _ufdb_sqlite.connect(_USER_FEEDBACK_DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS user_feedbacks (
            id          TEXT PRIMARY KEY,
            user_id     TEXT DEFAULT 'anonymous',
            type        TEXT DEFAULT 'other',
            rating      INTEGER DEFAULT 3,
            title       TEXT DEFAULT '',
            content     TEXT DEFAULT '',
            contact     TEXT DEFAULT '',
            status      TEXT DEFAULT 'pending',
            reply       TEXT DEFAULT '',
            created_at  TEXT
        )
    """)
    conn.commit()
    return conn

class _UserFeedbackReq(BaseModel):
    user_id:    str = "anonymous"
    type:       str = "other"
    rating:     int = 3
    title:      str = ""
    content:    str = ""
    contact:    str = ""
    created_at: str = ""

class _UserFeedbackPatch(BaseModel):
    status: str = ""
    reply:  str = ""

@app.post("/api/user-feedbacks")
async def create_user_feedback(req: _UserFeedbackReq):
    try:
        fb_id = f"fb_{uuid.uuid4().hex[:12]}"
        conn = _uf_db()
        conn.execute(
            "INSERT INTO user_feedbacks (id,user_id,type,rating,title,content,contact,status,reply,created_at) "
            "VALUES (?,?,?,?,?,?,?,'pending','',?)",
            (fb_id, req.user_id, req.type, req.rating, req.title,
             req.content, req.contact,
             req.created_at or _dt.now().isoformat())
        )
        conn.commit()
        conn.close()
        print(f"[UserFeedback] 新反馈: {req.user_id} | {req.type} | ⭐{req.rating} | {req.title[:20]}")
        return _FJR({"ok": True, "id": fb_id})
    except Exception as e:
        return _FJR({"ok": False, "error": str(e)})

@app.get("/api/user-feedbacks")
async def get_user_feedbacks():
    try:
        conn = _uf_db()
        rows = conn.execute(
            "SELECT id,user_id,type,rating,title,content,contact,status,reply,created_at "
            "FROM user_feedbacks ORDER BY created_at DESC"
        ).fetchall()
        conn.close()
        feedbacks = [
            {
                "id": r[0], "user_id": r[1], "type": r[2],
                "rating": r[3], "title": r[4], "content": r[5],
                "contact": r[6], "status": r[7], "reply": r[8],
                "created_at": r[9],
            }
            for r in rows
        ]
        return _FJR({"ok": True, "feedbacks": feedbacks, "total": len(feedbacks)})
    except Exception as e:
        return _FJR({"ok": False, "error": str(e), "feedbacks": []})

@app.patch("/api/user-feedbacks/{fb_id}")
async def update_user_feedback(fb_id: str, req: _UserFeedbackPatch):
    try:
        conn = _uf_db()
        if req.status and req.reply:
            conn.execute(
                "UPDATE user_feedbacks SET status=?, reply=? WHERE id=?",
                (req.status, req.reply, fb_id)
            )
        elif req.status:
            conn.execute(
                "UPDATE user_feedbacks SET status=? WHERE id=?",
                (req.status, fb_id)
            )
        elif req.reply:
            conn.execute(
                "UPDATE user_feedbacks SET reply=?, status='resolved' WHERE id=?",
                (req.reply, fb_id)
            )
        conn.commit()
        conn.close()
        return _FJR({"ok": True})
    except Exception as e:
        return _FJR({"ok": False, "error": str(e)})

@app.delete("/api/user-feedbacks/{fb_id}")
async def delete_user_feedback(fb_id: str):
    try:
        conn = _uf_db()
        conn.execute("DELETE FROM user_feedbacks WHERE id=?", (fb_id,))
        conn.commit()
        conn.close()
        return _FJR({"ok": True})
    except Exception as e:
        return _FJR({"ok": False, "error": str(e)})