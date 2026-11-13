# Zhijian — 智鉴 · Multimodal Anti-Fraud Assistant

A team-built anti-fraud prototype connecting multimodal input, risk assessment, explanations, suggested actions, and guardian intervention. The repository includes a Python backend, a Vue web interface, and a WeChat mini-program.

## My contribution — Changbin Wang

My implementation work focused on the web user interface and administration interface. I organized risk levels, evidence, and recommended actions into detection reports; implemented follow-up questions carrying detection context and guardian-alert configuration; and developed administration flows for knowledge maintenance, evaluation, and feedback handling. The backend and mini-program are included as part of the team project.

For a quick code walkthrough, see [detection](web/src/views/DetectView.vue), [follow-up questions](web/src/views/FollowupView.vue), [guardian configuration](web/src/views/GuardianView.vue), and [feedback administration](web/src/views/AdminFeedbackView.vue).

## Workflow

```text
Text / image / audio / video
              ↓
Input processing and transcription / OCR
              ↓
Risk assessment + case retrieval + model reasoning
              ↓
Explanation and suggested action
              ↓
User review / guardian intervention / feedback
```

## Source map

| Component | Location | Purpose |
| --- | --- | --- |
| API integration | `backend/app.py` | FastAPI entry point and application routes |
| Multimodal input | `backend/module01_multimodal_input.py` | Text, image, and audio preprocessing |
| Decision engine | `backend/module02_decision_engine.py` | Case retrieval and model-assisted assessment |
| Context handling | `backend/module02_extension.py` | Multi-turn recognition and modality-aware routing |
| Intervention | `backend/module03_intervention.py` | Risk reports and guardian notification logic |
| Evolution | `backend/module04_evolution.py` | Scheduled case/update workflow |
| Evaluation | `backend/module05_evaluation.py` | Evaluation endpoints and utilities |
| Web UI | `web/` | Vue + TypeScript dashboard and user flows |
| WeChat UI | `miniprogram/` | Mini-program pages, components, and services |

## Local setup

### Backend

Use Python 3.10+ in a dedicated environment:

```sh
cd backend
python -m venv .venv
# Activate .venv using the command appropriate for your shell.
python -m pip install -r requirements.txt
```

Set the variables listed in `.env.example` in your shell. The code reads process environment variables; the example file is not automatically loaded. Model-backed features require your own provider credentials. Audio/video features additionally require FFmpeg/ffprobe; OCR requires Tesseract and the appropriate language data. Python dependencies and model weights can be large, and first use may download models.

```sh
python -m uvicorn app:app --host 127.0.0.1 --port 8888
```

API documentation is available at `http://127.0.0.1:8888/docs`. Keep the working directory at `backend/`, as runtime paths are relative to it.

### Web interface

From the repository root, in a separate terminal, use Node.js satisfying `web/package.json` (Node 22.12+ is one supported option):

```sh
cd web
npm ci
npm run dev -- --host 127.0.0.1
```

`VITE_API_BASE` defaults to `http://127.0.0.1:8888`. Optional direct browser-side model calls use `VITE_SILICONFLOW_API_KEY`: **do not set a real secret in a publicly deployed frontend**, since browser bundles expose these values. Use a backend proxy before deploying that feature.

### WeChat mini-program

Import `miniprogram/` into WeChat Developer Tools. The published configuration uses `touristappid`; configure your own AppID and the backend URL in `miniprogram/utils/request.js` for a real device. A phone cannot reach the computer backend via its own `127.0.0.1`. The subscription implementation in `backend/module_subscribe.py` is not mounted by the current `app.py`; it needs application integration and your own WeChat configuration before use. Legacy standalone HTML is preserved for reference; the primary web app is `web/`.

## Demonstration scope

This is a prototype repository, not an operational fraud-prevention service. Some views contain demonstration data or local fallback behavior. Source code for an integration does not mean that the external service is configured or available. Notifications require explicit local configuration and should only be tested with consenting recipients.

The current local/demo authentication needs hardening before any public deployment. Real user data, detection reports, local databases, caches, credentials, and model weights are excluded. This release makes no claim of real-world loss reduction or independently verified model accuracy.

The mini-program retains components from a Tencent CloudBase starter template; see [template provenance](miniprogram/docs/TEMPLATE_README.md). No open-source license has been added to the overall project.

## 中文说明

智鉴围绕“输入—判断—解释—行动—监护人干预”组织反诈流程，本仓库包含后端、网页端和微信小程序端源码。项目当前作为本地原型和作品展示：部分页面使用演示数据或本地回退逻辑，真实模型调用、邮件通知和微信订阅消息需要另行配置。

公开版移除了真实密钥、个人邮箱、旧公网调试地址、历史检测报告与数据库；保留原始业务实现，补充配置示例。不要将演示认证机制直接用于公网服务。

## Release checks

- Python source files passed syntax parsing.
- The web frontend passed its TypeScript check and production build.
- Live model calls, mail delivery, WeChat integration, and full end-to-end behavior have not been validated for this public configuration.
