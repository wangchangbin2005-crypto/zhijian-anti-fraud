# Zhijian WeChat Mini-Program / 智鉴小程序

The mini-program includes login, detection, follow-up questions, history, profile, guardian configuration, learning, and guidance pages. See the [project overview](../README.md).

## Setup

1. Import this directory into WeChat Developer Tools.
2. Run `npm install` here, then use **Tools → Build npm** in Developer Tools.
3. Configure your own AppID in `project.config.json` when required. The public source uses `touristappid`.
4. Set the backend address in `utils/request.js`. The default is `http://127.0.0.1:8888`; a physical device needs a reachable backend and the appropriate WeChat domain configuration.
5. Start the FastAPI backend as described in the root README.

Live model and notification functions require separate configuration. Some local/template services retain mock behavior; this is a development prototype.

## Template provenance

The client was adapted using a Tencent CloudBase enterprise-website starter template. The original README is preserved at [docs/TEMPLATE_README.md](docs/TEMPLATE_README.md), and inherited components remain in the source. That document describes the starter template, not the current anti-fraud application.

## 中文说明

这是智鉴项目的微信小程序端，包含检测、追问、历史记录与监护人配置等页面。请先构建 npm 依赖，再配置 AppID 和后端地址。原始云开发模板说明已保留，当前功能与运行方法以本文件及根目录 README 为准。
