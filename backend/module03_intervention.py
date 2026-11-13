"""
模块03：实时干预与交互
包含分级预警、监护人联动、安全监测报告自动生成
依赖: pip install fastapi jinja2 aiosmtplib httpx weasyprint
"""

import asyncio
import json
import os
import uuid
from datetime import datetime
from dataclasses import dataclass, field
from typing import Optional

import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import APIRouter
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel

from module02_decision_engine import DecisionResult, RiskLevel, FraudType


# ─────────────────────────────────────────────
# 数据结构
# ─────────────────────────────────────────────

@dataclass
class InterventionRecord:
    """每次干预记录，写入数据库供报告生成使用"""
    record_id: str
    user_id: str
    timestamp: str
    risk_level: str
    fraud_type: str
    confidence: float
    action_taken: list[str]
    explanation: str
    guardian_notified: bool = False


@dataclass
class GuardianConfig:
    """监护人配置"""
    name: str
    phone: str
    email: str
    notify_on: list[str] = field(default_factory=lambda: ["high", "critical"])


# ─────────────────────────────────────────────
# ① 分级预警控制器
# ─────────────────────────────────────────────

INTERVENTION_ACTIONS = {
    RiskLevel.SAFE: [],
    RiskLevel.LOW: ["popup_tip"],
    RiskLevel.MEDIUM: ["popup_warning", "voice_alert"],
    RiskLevel.HIGH: ["popup_block", "voice_alert", "notify_guardian"],
    RiskLevel.CRITICAL: ["popup_block", "voice_alert", "notify_guardian", "auto_report"],
}

POPUP_MESSAGES = {
    RiskLevel.LOW: {
        "title": "⚠️ 安全提示",
        "body": "检测到轻微风险，请保持警惕，勿轻信陌生人转账请求。",
        "level": "info",
    },
    RiskLevel.MEDIUM: {
        "title": "🚨 风险警告",
        "body": "当前对话存在诈骗风险特征，请停止操作并向家人确认。",
        "level": "warning",
    },
    RiskLevel.HIGH: {
        "title": "🔴 高危阻断",
        "body": "已检测到高危诈骗行为，系统已自动通知您的监护人。请立即停止所有转账操作！",
        "level": "danger",
    },
    RiskLevel.CRITICAL: {
        "title": "🆘 紧急告警",
        "body": "极度危险！已自动联系监护人并生成警情报告。请勿继续操作，等待帮助。",
        "level": "critical",
    },
}


class AlertController:
    def get_alert_payload(self, result: DecisionResult) -> dict:
        actions = INTERVENTION_ACTIONS.get(result.risk_level, [])
        popup = POPUP_MESSAGES.get(result.risk_level)
        return {
            "risk_level": result.risk_level.value,
            "fraud_type": result.fraud_type.value,
            "confidence": result.confidence,
            "actions": actions,
            "popup": popup,
            "should_block_ui": result.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL),
            "voice_script": self._get_voice_script(result) if "voice_alert" in actions else None,
        }

    def _get_voice_script(self, result: DecisionResult) -> str:
        return (
            f"警告！系统检测到{result.fraud_type.value}风险，"
            f"置信度{int(result.confidence * 100)}%，请立即停止操作。"
        )


# ─────────────────────────────────────────────
# ② 监护人联动模块
# ─────────────────────────────────────────────

class GuardianNotifier:
    """通知监护人：QQ邮箱 SMTP + Twilio 语音电话 + Server酱微信推送"""

    # ── QQ 邮箱配置 ──────────────────────────────
    SMTP_HOST = "smtp.qq.com"
    SMTP_PORT = 587
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASS = os.getenv("SMTP_PASS", "")

    # ─────────────────────────────────────────────
    # 邮件通知
    # ─────────────────────────────────────────────
    async def notify_email(self, guardian: GuardianConfig, result: DecisionResult, user_id: str):
        import smtplib, asyncio
        subject = f"[反诈预警] {user_id} 的账户检测到{result.risk_level.value}风险"
        body = self._build_email_body(result, user_id)

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"<{self.SMTP_USER}>"
        msg["To"] = guardian.email
        msg.attach(MIMEText(body, "html", "utf-8"))

        # 在线程池中运行同步 SMTP，避免阻塞事件循环
        def _send_sync():
            with smtplib.SMTP(self.SMTP_HOST, self.SMTP_PORT) as s:
                s.starttls()
                s.login(self.SMTP_USER, self.SMTP_PASS)
                s.send_message(msg)

        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, _send_sync)
            print(f"[Email] 邮件发送成功 -> {guardian.email}")
            return True
        except Exception as e:
            print(f"[Email] 邮件发送失败: {e}")
            return False

    def _build_email_body(self, result: DecisionResult, user_id: str) -> str:
        color_map = {
            "low": "#f59e0b", "medium": "#f97316",
            "high": "#ef4444", "critical": "#7f1d1d",
        }
        color = color_map.get(result.risk_level.value, "#374151")
        return f"""
        <html><body style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
          <h2 style="color:{color}">⚠️ 反诈预警通知</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold">用户</td><td style="padding:8px">{user_id}</td></tr>
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold">风险等级</td>
                <td style="padding:8px;color:{color};font-weight:bold">{result.risk_level.value.upper()}</td></tr>
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold">诈骗类型</td><td style="padding:8px">{result.fraud_type.value}</td></tr>
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold">置信度</td><td style="padding:8px">{int(result.confidence * 100)}%</td></tr>
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold">分析说明</td><td style="padding:8px">{result.explanation}</td></tr>
            <tr><td style="padding:8px;background:#f9fafb;font-weight:bold">时间</td><td style="padding:8px">{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</td></tr>
          </table>
          <p style="margin-top:16px;font-size:13px;color:#6b7280">
            此邮件由反诈智能体系统自动发送，请及时联系您的被监护人了解情况。
          </p>
        </body></html>
        """

    # ─────────────────────────────────────────────
    # Server酱微信推送
    # ─────────────────────────────────────────────
    async def notify_wechat(self, guardian: GuardianConfig, result: DecisionResult, user_id: str):
        """
        Server酱微信推送（免费，扫码绑定微信即可）
        申请步骤：
        1. 打开 https://sct.ftqq.com 用微信扫码登录
        2. 复制 SendKey（格式为 SCT 开头的字符串）
        3. 设置环境变量 SERVERCHAN_KEY=你的SendKey 后重启后端
        """
        import httpx

        send_key = os.getenv("SERVERCHAN_KEY", "")
        if not send_key:
            print("[WeChat] 未配置 SERVERCHAN_KEY，跳过微信推送")
            print("[WeChat] 请前往 https://sct.ftqq.com 获取 SendKey")
            return

        risk_map = {
            "safe": "✅ 安全", "low": "⚠️ 低风险",
            "medium": "🔶 中风险", "high": "🔴 高风险", "critical": "🆘 极高风险",
        }
        risk_label = risk_map.get(result.risk_level.value, result.risk_level.value)
        confidence = int(result.confidence * 100)

        title = f"🚨 反诈预警｜{result.fraud_type.value}｜{risk_label}"
        desp = f"""## ⚠️ 反诈智能体预警通知

**监护人：** {guardian.name}
**被监护用户：** {user_id}
**检测时间：** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

---

### 风险摘要

| 项目 | 内容 |
|------|------|
| 风险等级 | **{risk_label}** |
| 诈骗类型 | {result.fraud_type.value} |
| 置信度 | {confidence}% |

### 分析说明

{result.explanation}

### 命中证据

{chr(10).join(f"- {e}" for e in (result.evidence or ["暂无具体证据"]))}

---

> 请立即联系您的家人确认安全，如有需要请拨打反诈热线 **96110**
"""

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"https://sctapi.ftqq.com/{send_key}.send",
                    data={"title": title, "desp": desp},
                )
                data = resp.json()
                if data.get("code") == 0:
                    print(f"[WeChat] 微信推送成功 -> {guardian.name}")
                else:
                    print(f"[WeChat] 微信推送失败: {data.get('message')} | code={data.get('code')}")
        except Exception as e:
            print(f"[WeChat] 微信推送异常: {e}")

    async def notify_sms(self, guardian: GuardianConfig, result: DecisionResult, user_id: str):
        """兼容旧接口，实际调用微信推送"""
        await self.notify_wechat(guardian, result, user_id)


# ─────────────────────────────────────────────
# ③ 报告生成器
# ─────────────────────────────────────────────

REPORT_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>反诈安全监测报告 · #{record_id}</title>
  <style>
    *{{box-sizing:border-box;margin:0;padding:0}}
    body{{font-family:'PingFang SC','Microsoft YaHei UI','Segoe UI',sans-serif;background:#f0f2ff;color:#1a1a3e;min-height:100vh;padding:32px 16px}}
    .page{{max-width:860px;margin:0 auto}}

    /* 顶部 header */
    .rpt-header{{background:linear-gradient(135deg,#312e81,#1d4ed8,#0369a1);border-radius:16px;padding:32px 36px;margin-bottom:24px;position:relative;overflow:hidden}}
    .rpt-header::before{{content:'';position:absolute;top:-60px;right:-60px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,0.06)}}
    .rpt-header::after{{content:'';position:absolute;bottom:-40px;left:40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,0.04)}}
    .rpt-logo{{display:flex;align-items:center;gap:12px;margin-bottom:20px}}
    .rpt-logo-icon{{width:40px;height:40px;background:rgba(255,255,255,0.15);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;border:1px solid rgba(255,255,255,0.25)}}
    .rpt-logo-text{{font-size:13px;color:rgba(255,255,255,0.7);letter-spacing:2px;font-family:monospace}}
    .rpt-title{{font-size:28px;font-weight:800;color:#fff;margin-bottom:6px;letter-spacing:-0.5px}}
    .rpt-subtitle{{font-size:13px;color:rgba(255,255,255,0.6);font-family:monospace;letter-spacing:1px}}

    /* 风险等级横幅 */
    .risk-banner{{border-radius:12px;padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;gap:16px}}
    .risk-banner-critical{{background:linear-gradient(135deg,#450a0a,#7f1d1d);border:1px solid rgba(239,68,68,0.4)}}
    .risk-banner-high{{background:linear-gradient(135deg,#431407,#7c2d12);border:1px solid rgba(249,115,22,0.4)}}
    .risk-banner-medium{{background:linear-gradient(135deg,#422006,#78350f);border:1px solid rgba(245,158,11,0.4)}}
    .risk-banner-low{{background:linear-gradient(135deg,#052e16,#14532d);border:1px solid rgba(34,197,94,0.4)}}
    .risk-banner-safe{{background:linear-gradient(135deg,#0f172a,#1e3a5f);border:1px solid rgba(99,102,241,0.3)}}
    .risk-icon{{font-size:36px;flex-shrink:0}}
    .risk-label{{font-size:22px;font-weight:800;color:#fff;margin-bottom:4px}}
    .risk-desc{{font-size:13px;color:rgba(255,255,255,0.6)}}

    /* 信息卡片网格 */
    .info-grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}}
    .info-card{{background:#fff;border-radius:12px;padding:16px 18px;border:1px solid rgba(99,102,241,0.12)}}
    .info-label{{font-size:11px;font-weight:700;color:#8b92c4;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}}
    .info-value{{font-size:15px;font-weight:600;color:#1a1a3e}}
    .info-value.mono{{font-family:monospace;font-size:13px;color:#4b5090}}

    /* 内容卡片 */
    .card{{background:#fff;border-radius:12px;padding:22px 24px;margin-bottom:16px;border:1px solid rgba(99,102,241,0.12)}}
    .card-title{{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:#1a1a3e;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #f0f2ff}}
    .card-title-bar{{width:3px;height:16px;background:linear-gradient(180deg,#6366f1,#3b82f6);border-radius:2px}}

    /* 说明文字 */
    .explanation{{font-size:14px;line-height:1.85;color:#374151}}

    /* 证据标签 */
    .evidence-list{{display:flex;flex-wrap:wrap;gap:8px}}
    .evidence-tag{{padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;background:rgba(239,68,68,0.08);color:#dc2626;border:1px solid rgba(239,68,68,0.2)}}

    /* 案例卡片 */
    .case-item{{background:#f8f9ff;border-radius:8px;padding:14px 16px;margin-bottom:8px;border-left:3px solid #6366f1}}
    .case-type{{font-size:12px;font-weight:700;color:#6366f1;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px}}
    .case-similarity{{font-size:11px;color:#8b92c4;float:right;font-family:monospace}}
    .case-summary{{font-size:13px;color:#4b5090;line-height:1.6}}

    /* 建议 */
    .rec-item{{display:flex;gap:12px;padding:12px 16px;border-radius:8px;margin-bottom:8px;background:#eff6ff;border:1px solid rgba(59,130,246,0.15)}}
    .rec-num{{width:22px;height:22px;background:#3b82f6;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;margin-top:1px}}
    .rec-text{{font-size:14px;color:#1e40af;line-height:1.6}}

    /* 底部 */
    .rpt-footer{{text-align:center;padding:20px;font-size:12px;color:#8b92c4;line-height:1.8}}
    .hotline{{display:inline-block;font-size:20px;font-weight:800;color:#dc2626;font-family:monospace;letter-spacing:2px}}

    @media print{{body{{background:#fff}}  .rpt-header{{print-color-adjust:exact}}}}
  </style>
</head>
<body>
<div class="page">

  <!-- 顶部 -->
  <div class="rpt-header">
    <div class="rpt-logo">
      <div class="rpt-logo-icon">🛡️</div>
      <div class="rpt-logo-text">ANTI-FRAUD AI v2.0 · 反诈智能体</div>
    </div>
    <div class="rpt-title">安全监测报告</div>
    <div class="rpt-subtitle">SECURITY DETECTION REPORT · #{record_id}</div>
  </div>

  <!-- 风险等级横幅 -->
  <div class="risk-banner risk-banner-{risk_level}">
    <div class="risk-icon">{risk_icon}</div>
    <div>
      <div class="risk-label">{risk_level_display}</div>
      <div class="risk-desc">诈骗类型：{fraud_type} &nbsp;·&nbsp; 系统置信度：{confidence}%</div>
    </div>
  </div>

  <!-- 基本信息 -->
  <div class="info-grid">
    <div class="info-card">
      <div class="info-label">报告编号</div>
      <div class="info-value mono">#{record_id}</div>
    </div>
    <div class="info-card">
      <div class="info-label">生成时间</div>
      <div class="info-value mono" style="font-size:12px">{timestamp}</div>
    </div>
    <div class="info-card">
      <div class="info-label">检测用户</div>
      <div class="info-value mono">{user_id}</div>
    </div>
  </div>

  <!-- 风险说明 -->
  <div class="card">
    <div class="card-title"><span class="card-title-bar"></span>风险说明</div>
    <div class="explanation">{explanation}</div>
  </div>

  <!-- 命中证据 -->
  <div class="card">
    <div class="card-title"><span class="card-title-bar" style="background:linear-gradient(180deg,#ef4444,#f97316)"></span>命中证据</div>
    {evidence_html}
  </div>

  <!-- 相似案例 -->
  <div class="card">
    <div class="card-title"><span class="card-title-bar" style="background:linear-gradient(180deg,#8b5cf6,#6366f1)"></span>相似历史案例</div>
    {cases_html}
  </div>

  <!-- 防御建议 -->
  <div class="card">
    <div class="card-title"><span class="card-title-bar" style="background:linear-gradient(180deg,#22c55e,#16a34a)"></span>防御建议</div>
    {recommendations_html}
  </div>

  <!-- 底部 -->
  <div class="rpt-footer">
    本报告由反诈智能体系统自动生成，检测结果仅供参考，不构成法律依据。<br>
    如遭遇诈骗或有疑问，请立即拨打全国反诈热线<br>
    <span class="hotline">96110</span>
  </div>

</div>
</body>
</html>"""

RECOMMENDATIONS = {
    FraudType.AI_VOICE: ["立即挂断并回拨官方号码验证", "不要相信视频或语音中的紧急转账请求", "向家人当面确认"],
    FraudType.INVESTMENT: ["任何'保本高收益'均为诈骗", "不要在非正规平台充值", "向证监会官网核查平台资质"],
    FraudType.PART_TIME: ["正规兼职不需要垫付资金", "刷单本身违法，不要参与", "立即停止所有垫付操作"],
    FraudType.FAKE_CREDIT: ["征信问题只能向人民银行申请处理", "任何'清除征信'的说法均为谎言",
                            "拨打12363征信服务热线核实"],
    FraudType.IMPERSONATION: ["公检法不会要求转账到'安全账户'", "主动挂断，拨打110核实",
                              "不要安装任何要求'屏幕共享'的软件"],
    FraudType.ROMANCE: ["网络感情需核实对方真实身份", "任何形式的借款请求都要警惕", "不要将感情与金钱挂钩"],
    FraudType.UNKNOWN: ["保持警惕，不要转账给陌生人", "拨打96110反诈热线咨询"],
}


class ReportGenerator:
    REPORT_DIR = "./reports"

    def __init__(self):
        os.makedirs(self.REPORT_DIR, exist_ok=True)

    def generate_html(self, record: InterventionRecord, result: DecisionResult) -> str:
        evidence_html = '<div class="evidence-list">' + "".join(
            f'<span class="evidence-tag">⚡ {e}</span>' for e in result.evidence
        ) + '</div>' if result.evidence else "<p style='color:#9ca3af;font-size:14px'>暂无具体证据</p>"

        cases_html = "".join(
            f'<div class="case-item"><span class="case-similarity">相似度 {c["similarity"]}</span><div class="case-type">{c["type"]}</div><div class="case-summary">{c["summary"]}</div></div>'
            for c in result.similar_cases
        ) or "<p style='color:#9ca3af;font-size:14px'>知识库中无相似案例</p>"

        recs = RECOMMENDATIONS.get(result.fraud_type, RECOMMENDATIONS[FraudType.UNKNOWN])
        recommendations_html = "".join(
            f'<div class="rec-item"><div class="rec-num">{i+1}</div><div class="rec-text">{r}</div></div>'
            for i, r in enumerate(recs)
        )

        level_display = {
            "safe": "安全", "low": "低风险",
            "medium": "中风险", "high": "高风险", "critical": "极高风险",
        }.get(record.risk_level, record.risk_level)

        risk_icon = {
            "safe": "✅", "low": "⚠️",
            "medium": "🔶", "high": "🔴", "critical": "🆘",
        }.get(record.risk_level, "⚠️")

        html = REPORT_TEMPLATE.format(
            record_id=record.record_id[:8],
            timestamp=record.timestamp,
            user_id=record.user_id,
            risk_level=record.risk_level,
            risk_level_display=level_display,
            risk_icon=risk_icon,
            fraud_type=record.fraud_type,
            confidence=int(record.confidence * 100),
            explanation=record.explanation,
            evidence_html=evidence_html,
            cases_html=cases_html,
            recommendations_html=recommendations_html,
        )

        path = os.path.join(self.REPORT_DIR, f"report_{record.record_id[:8]}.html")
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        return path


# ─────────────────────────────────────────────
# 干预协调器（统一入口）
# ─────────────────────────────────────────────

GUARDIAN_STORE: dict[str, GuardianConfig] = {
    "default": GuardianConfig(
        name="Terry",
        phone="+8618021007270",
        email="demo@example.com",
        notify_on=["high", "critical"],
    ),
    "user_001": GuardianConfig(
        name="Terry",
        phone="+8618021007270",
        email="demo@example.com",
        notify_on=["high", "critical"],
    ),
    "user_002": GuardianConfig(
        name="Terry",
        phone="+8618021007270",
        email="demo@example.com",
        notify_on=["medium", "high", "critical"],
    ),
}


class InterventionCoordinator:
    def __init__(self):
        self.alert_controller = AlertController()
        self.notifier = GuardianNotifier()
        self.report_generator = ReportGenerator()
        self.records: list[InterventionRecord] = []

    async def intervene(self, result: DecisionResult, user_id: str) -> dict:
        payload = self.alert_controller.get_alert_payload(result)
        record = InterventionRecord(
            record_id=str(uuid.uuid4()),
            user_id=user_id,
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            risk_level=result.risk_level.value,
            fraud_type=result.fraud_type.value,
            confidence=result.confidence,
            action_taken=payload["actions"],
            explanation=result.explanation,
        )

        guardian = GUARDIAN_STORE.get(user_id, GUARDIAN_STORE["default"])

        report_path = None
        if "auto_report" in payload["actions"]:
            report_path = self.report_generator.generate_html(record, result)

        if "notify_guardian" in payload["actions"]:
            record.guardian_notified = True
            print(f"[Intervention] 后台发送监护人通知 -> {guardian.name}")

            # ── 关键优化：后台发送，不阻塞响应 ──────────────────
            async def _background_notify():
                tasks = [
                    self.notifier.notify_email(guardian, result, user_id),
                    self.notifier.notify_wechat(guardian, result, user_id),
                ]
                await asyncio.gather(*tasks, return_exceptions=True)

            asyncio.create_task(_background_notify())

        self.records.append(record)
        return {**payload, "record_id": record.record_id, "report_path": report_path}


# ─────────────────────────────────────────────
# FastAPI 路由
# ─────────────────────────────────────────────

router = APIRouter(prefix="/api/intervention", tags=["模块03-实时干预"])
coordinator = InterventionCoordinator()


class InterventionRequest(BaseModel):
    user_id: str = "default"
    risk_level: str
    fraud_type: str
    confidence: float
    intent: str = ""
    evidence: list[str] = []
    similar_cases: list[dict] = []
    explanation: str = ""
    raw_score: float = 0.0


@router.post("/intervene")
async def intervene(req: InterventionRequest):
    result = DecisionResult(
        risk_level=RiskLevel(req.risk_level),
        fraud_type=FraudType(req.fraud_type) if req.fraud_type in [f.value for f in FraudType] else FraudType.UNKNOWN,
        confidence=req.confidence,
        intent=req.intent,
        evidence=req.evidence,
        similar_cases=req.similar_cases,
        explanation=req.explanation,
        raw_score=req.raw_score,
    )
    response = await coordinator.intervene(result, req.user_id)
    return JSONResponse(response)


@router.post("/report/manual")
async def generate_manual_report(req: InterventionRequest):
    """手动触发报告生成（一键通报）"""
    result = DecisionResult(
        risk_level=RiskLevel(req.risk_level),
        fraud_type=FraudType(req.fraud_type) if req.fraud_type in [f.value for f in FraudType] else FraudType.UNKNOWN,
        confidence=req.confidence, intent=req.intent,
        evidence=req.evidence, similar_cases=req.similar_cases,
        explanation=req.explanation, raw_score=req.raw_score,
    )
    record = InterventionRecord(
        record_id=str(uuid.uuid4()), user_id=req.user_id,
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        risk_level=result.risk_level.value, fraud_type=result.fraud_type.value,
        confidence=result.confidence, action_taken=["manual_report"],
        explanation=result.explanation,
    )
    path = coordinator.report_generator.generate_html(record, result)
    return JSONResponse({"status": "ok", "report_path": path, "record_id": record.record_id})


@router.get("/report/{record_id}")
async def get_report(record_id: str):
    import glob, pathlib
    # 取 UUID 前8位（去掉横杠后取前8）
    clean_id = record_id.replace("-", "")
    short_id = record_id[:8]  # UUID 格式前8位本身就没横杠

    print(f"[Report] 请求 record_id={record_id}, short_id={short_id}")

    # 多种路径尝试
    report_dir = pathlib.Path("./reports")
    candidates = [
        report_dir / f"report_{short_id}.html",
        report_dir / f"report_{clean_id[:8]}.html",
        report_dir / f"report_{record_id}.html",
    ]
    for path in candidates:
        print(f"[Report] 尝试: {path}, 存在: {path.exists()}")
        if path.exists():
            return FileResponse(str(path), media_type="text/html")

    # glob 兜底
    matches = list(report_dir.glob(f"report_{short_id}*.html"))
    print(f"[Report] glob 结果: {matches}")
    if matches:
        return FileResponse(str(matches[0]), media_type="text/html")

    all_reports = [str(p) for p in sorted(report_dir.glob("report_*.html"))]
    return JSONResponse(
        {"error": "报告不存在", "record_id": record_id, "short_id": short_id, "available_count": len(all_reports),
         "latest_5": all_reports[-5:]}, status_code=404)