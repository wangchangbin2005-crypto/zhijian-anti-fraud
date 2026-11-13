# Zhijian Web / 智鉴 Web 用户端与管理端

Vue + TypeScript + Vite interfaces for detection, follow-up questions, guardian configuration, knowledge maintenance, evaluation, and feedback administration. See the [project overview](../README.md) for architecture and contributions.

## Run locally

From this directory, using Node.js compatible with `package.json`:

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Start the backend separately on port 8888. `VITE_API_BASE` can override the default `http://127.0.0.1:8888`; see `.env.example`.

## Validate

```sh
npm run build
```

This runs TypeScript validation and a production build. Generated `dist/` files are not tracked.

Some administration views have demonstration data or local fallback behavior. Browser-side model calls are optional; real service keys must not be embedded in a publicly deployed frontend. Scripts under `scripts/` are legacy content-generation helpers and are not required for the current build.

## 中文说明

网页端包含用户检测与处置流程，以及管理端知识维护、效果评估和反馈处理。按上述命令启动，配合独立运行的后端使用；部分页面保留演示数据或本地回退逻辑。
