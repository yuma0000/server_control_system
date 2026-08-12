# Universal Node.js API サーバー & 管理システム 技術仕様書 (v3.0.0)

## 1. システム概要 (System Overview)
本システムは、マルチ言語プログラム (Node.js, Python, Bash, PHP, Ruby) をサンドボックス環境で安全に実行・停止・予約（スケジュール）実行・ログキャプチャし、環境変数およびプロセス分離ストレージの管理を行う統合プラットフォームです。

v3.0.0 により、**サーバー (API Backend)** と **クライアント (Vite/React SPA)** の完全分離設計、**Railway トラフィック制限対策（Gzip圧縮・軽量ポーリング・CORS対応）**、および **`start.sh` から `node index.js` 実行時のプロセス残留防止策** を仕様化しています。

---

## 2. アーキテクチャ & サーバー/クライアント分離仕様 (Server & Client Separation)

### 2.1 独立動作モード (Standalone API vs Fullstack)
環境変数 `SERVE_STATIC` の値により、サーバーの動作モードを動的に切り替えます。

- **`SERVE_STATIC=false` (スタンドアロン API モード / 推奨)**:
  - サーバーは REST API のみに専念します。
  - 静的ファイル (HTML/JS/CSS) の配信を行わないため、クラウドサーバー (Railway, Render, Fly.io 等) のネットワーク転送量 (Egress Traffic) を最大 100% 削減可能。
  - フロントエンドは Vercel, Netlify, Cloudflare Pages, またはローカル端末から接続します。
- **`SERVE_STATIC=true` (フルスタック統合モード)**:
  - 単一の Node.js プロセスで API と ビルド済み React SPA (`dist/`) の両方を配信します。

### 2.2 実行コマンド体系 (`package.json`)
- `npm run build:server`: `esbuild` により `server.ts` を単一 CommonJS バンドル `dist/server.cjs` へコンパイル。
- `npm run start:server`: `SERVE_STATIC=false` で API サーバーのみを起動。
- `npm run build:client`: Vite により React フロントエンドを `dist/` に静的ビルド。
- `npm run dev:client`: クライアント単体開発サーバー (ポート 5173 / 3000) 起動。

---

## 3. Railway ネットワーク通信量削減仕様 (Network Bandwidth Optimization)

Railway などの転送量従量課金 / 制限対策として以下の3段階最適化を実施しています。

1. **HTTP Gzip / Deflate レスポンス圧縮 (`compression`)**:
   - Express ミドルウェアで全レスポンスを圧縮し、JSON データサイズを 70〜80% 削減。
2. **軽量ステータスポーリング API (`GET /api/sync?light=true`)**:
   - ポーリング時にはプログラムのコードソース本文（`content`, `code`）を除外し、ステータスとログのみを返却。転送量を約 95% 削減。
3. **CORS (Cross-Origin Resource Sharing) 許可設定**:
   - `Access-Control-Allow-Origin: *` (または `CORS_ORIGIN` 環境変数) により、別ドメインやローカル端末からの安全なクロスオリジン API 呼び出しを許可。

---

## 4. `start.sh` から `node index.js` 実行時のプロセス残留対策 (Process Leak Solutions)

シェルスクリプト `start.sh` 経由で Node.js プロセスを起動・停止する際、`node index.js` がバックグラウンドにゾンビプロセスとして残る問題に対する仕様解決策です。

### 解決策 1: `exec` キーワードの使用（標準推奨）
シェルプロセス (bash) を `node` プロセスに直接置換 (`exec`) します。
停止シグナル (`SIGTERM` / `SIGINT`) が直接 Node.js プロセスに届くため、親プロセス終了に伴うゾンビ化が発生しません。
```bash
#!/bin/bash
# start.sh
exec node index.js
```

### 解決策 2: シグナルトラップ (`trap`) による子プロセス管理
事前に環境構築やログ出力等の前処理が必要な場合、`trap` を使用してシグナルを受信した際に子プロセス PID に強制終了命令を発行します。
```bash
#!/bin/bash
# start.sh
trap 'kill -TERM "$PID"; wait "$PID"' TERM INT EXIT

node index.js &
PID=$!
wait "$PID"
```

---

## 5. マルチプラットフォーム デプロイ仕様 (Deployment Options)

### 5.1 Render (バックエンド API)
- **Environment**: Node
- **Build Command**: `npm run build:server`
- **Start Command**: `npm run start:server`
- **Environment Variable**: `SERVE_STATIC=false`, `CORS_ORIGIN=*`

### 5.2 Vercel / Netlify (フロントエンド Web サイト)
- **Framework Preset**: Vite
- **Build Command**: `npm run build:client`
- **Output Directory**: `dist`
- **Environment Variable**: `VITE_API_URL` = (バックエンド API サーバーのドメイン)

### 5.3 Docker / VPS
付属の `Dockerfile` および `docker-compose.yml` を使用し、独立コンテナとして実行。
```bash
docker compose up -d --build
```

---

## 6. 持続化ストレージ & サンドボックス構造 (Persistence & Sandbox)

- **環境変数 `DATA_DIR`**: 永続化ストレージの基本パス (デフォルト: `./data`)
- **Primary State File**: `${DATA_DIR}/server_state.json`
- **Process Isolated Directory**: `${DATA_DIR}/processes/<programId>/`
  - プロセス実行時、全構成ファイルが個別の隔離ディレクトリに自動デプロイされ、`cwd` として隔離実行されます。

---

## 7. 主要 REST API エンドポイント (API Reference)

| メソッド | パス | 説明 | ネットワーク最適化パラメータ |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/status` | システム状態・CPU・メモリ・Uptime 取得 | - |
| `GET` | `/api/sync` | システム状態と全プログラムデータの取得 | `?light=true` (軽量モード) |
| `POST` | `/api/sync` | クライアント設定の双方向同期 | - |
| `POST` | `/api/programs` | プログラム・構成ファイルの新規保存・更新 | - |
| `DELETE` | `/api/programs/:id` | プログラムと隔離ディレクトリの削除 | - |
| `POST` | `/api/programs/:id/run` | プログラムの手動実行起動 | - |
| `POST` | `/api/programs/:id/stop` | 実行中プロセスの安全停止 | - |
| `POST` | `/api/railway/vars` | 共通環境変数の適用 | - |

---

## 8. 環境変数仕様 (Environment Variables)

- `PORT`: サーバー受付ポート (デフォルト: `3000`)
- `SERVE_STATIC`: `false` で API 専用モード、`true` で静的ファイル同梱モード
- `CORS_ORIGIN`: 許可する CORS オリジン (デフォルト: `*`)
- `DATA_DIR`: 永続ストレージの保存パス (デフォルト: `./data`)
- `GEMINI_API_KEY`: AI 機能用の API キー
