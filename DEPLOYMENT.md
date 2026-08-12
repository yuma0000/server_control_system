# 🚀 サーバー・クライアント完全分離 & 汎用デプロイガイド

本プロジェクトは **バックエンド API サーバー (Node.js/Express)** と **フロントエンド (Vite/React SPA)** が完全に分離された設計になっています。
Railway 以外の主要なクラウドサービス（Render, Fly.io, Vercel, Netlify, Docker/VPS）でも簡単に動作させることができます。

---

## 📁 構成概要

| コンポーネント | 役割 | 起動コマンド / 成果物 | 推奨ホスティング |
| :--- | :--- | :--- | :--- |
| **バックエンド API サーバー** | プロセス管理, スケジューラー, API | `npm run start:server` (`dist/server.cjs`) | Render, Fly.io, Railway, VPS, Docker |
| **フロントエンド Web** | ダッシュボード UI | `npm run build:client` (`dist/` 静的ファイル) | Vercel, Netlify, Cloudflare Pages |

---

## 🛠️ 1. ローカル開発・ビルド環境での分離起動

### サーバーのみ起動 (API 専用モード)
```bash
# ビルド
npm run build:server

# 起動 (SERVE_STATIC=false)
npm run start:server
# サーバーが http://localhost:3000 で立ち上がります
```

### クライアントのみ起動
```bash
npm run dev:client
# Vite 開発サーバーが http://localhost:5173 で立ち上がります
# 画面内の「永続化データ同期」タブから API 接続先 URL を設定できます
```

---

## 🌐 2. プラットフォーム別 デプロイ手順

### A. Render (バックエンド API サーバー)
1. Render ダッシュボードで **New > Web Service** を選択
2. 本リポジトリを接続し、以下を設定:
   - **Environment**: `Node`
   - **Build Command**: `npm run build:server`
   - **Start Command**: `npm run start:server`
3. Environment Variables (環境変数):
   - `SERVE_STATIC`: `false`
   - `CORS_ORIGIN`: `*` (またはフロントエンドのドメイン)

---

### B. Vercel / Netlify (フロントエンド Web サイト)
1. Vercel または Netlify にリポジトリを接続
2. 設定:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build:client`
   - **Output Directory**: `dist`
3. 環境変数 (任意):
   - `VITE_API_URL`: Render や Fly.io でデプロイした API サーバーの URL (例: `https://my-api.onrender.com`)

---

### C. Docker / VPS (オールインワン or 分離)
付属の `Dockerfile` および `docker-compose.yml` を使用します。

```bash
# Docker コンテナ起動
docker compose up -d --build
```

---

### D. Fly.io (バックエンド API サーバー)
```bash
# flyctl で初期化とデプロイ
fly launch
fly secrets set SERVE_STATIC=false
fly deploy
```

---

## ⚙️ 環境変数一覧

| 変数名 | 説明 | デフォルト値 |
| :--- | :--- | :--- |
| `PORT` | サーバーのポート番号 | `3000` |
| `SERVE_STATIC` | 静的フロントエンドも同梱配信するか | `false` (分離時は false) |
| `CORS_ORIGIN` | 許可するフロントエンドのオリジン | `*` |
| `DATA_DIR` | プロセスや状態を永続化するディレクトリ | `./data` |
| `VITE_API_URL` | クライアントビルド時のデフォルト API URL | `""` |
