import React from 'react';
import { 
  FileText, 
  RefreshCw, 
  Cpu, 
  Clock, 
  Layers,
  Smartphone,
  Download,
  Folder,
  Upload,
  ChevronDown
} from 'lucide-react';

export const TechSpecView: React.FC = () => {
  const downloadMarkdown = () => {
    const markdownContent = `# Universal Node.js API サーバー & 管理システム 技術仕様書 (v3.0.0)

## 1. システム概要 (System Overview)
本システムは、マルチ言語プログラム (Node.js, Python, Bash, PHP, Ruby) をサンドボックス環境で安全に実行・停止・予約（スケジュール）実行・ログキャプチャし、環境変数およびプロセス分離ストレージの管理を行う統合プラットフォームです。

v3.0.0 により、**サーバー (API Backend)** と **クライアント (Vite/React SPA)** の完全分離設計、**Railway トラフィック制限対策（Gzip圧縮・軽量ポーリング・CORS対応）**、および **\`start.sh\` から \`node index.js\` 実行時のプロセス残留防止策** を仕様化しています。

---

## 2. アーキテクチャ & サーバー/クライアント分離仕様 (Server & Client Separation)

### 2.1 独立動作モード (Standalone API vs Fullstack)
環境変数 \`SERVE_STATIC\` の値により、サーバーの動作モードを動的に切り替えます。

- **\`SERVE_STATIC=false\` (スタンドアロン API モード / 推奨)**:
  - サーバーは REST API のみに専念します。
  - 静的ファイル (HTML/JS/CSS) の配信を行わないため、クラウドサーバー (Railway, Render, Fly.io 等) のネットワーク転送量 (Egress Traffic) を最大 100% 削減可能。
  - フロントエンドは Vercel, Netlify, Cloudflare Pages, またはローカル端末から接続します。
- **\`SERVE_STATIC=true\` (フルスタック統合モード)**:
  - 単一の Node.js プロセスで API と ビルド済み React SPA (\`dist/\`) の両方を配信します。

### 2.2 実行コマンド体系 (\`package.json\`)
- \`npm run build:server\`: \`esbuild\` により \`server.ts\` を単一 CommonJS バンドル \`dist/server.cjs\` へコンパイル。
- \`npm run start:server\`: \`SERVE_STATIC=false\` で API サーバーのみを起動。
- \`npm run build:client\`: Vite により React フロントエンドを \`dist/\` に静的ビルド。
- \`npm run dev:client\`: クライアント単体開発サーバー (ポート 5173 / 3000) 起動。

---

## 3. Railway ネットワーク通信量削減仕様 (Network Bandwidth Optimization)

Railway などの転送量従量課金 / 制限対策として以下の3段階最適化を実施しています。

1. **HTTP Gzip / Deflate レスポンス圧縮 (\`compression\`)**:
   - Express ミドルウェアで全レスポンスを圧縮し、JSON データサイズを 70〜80% 削減。
2. **軽量ステータスポーリング API (\`GET /api/sync?light=true\`)**:
   - ポーリング時にはプログラムのコードソース本文（\`content\`, \`code\`）を除外し、ステータスとログのみを返却。転送量を約 95% 削減。
3. **CORS (Cross-Origin Resource Sharing) 許可設定**:
   - \`Access-Control-Allow-Origin: *\` (または \`CORS_ORIGIN\` 環境変数) により、別ドメインやローカル端末からの安全なクロスオリジン API 呼び出しを許可。

---

## 4. \`start.sh\` から \`node index.js\` 実行時のプロセス残留対策 (Process Leak Solutions)

シェルスクリプト \`start.sh\` 経由で Node.js プロセスを起動・停止する際、\`node index.js\` がバックグラウンドにゾンビプロセスとして残る問題に対する仕様解決策です。

### 解決策 1: \`exec\` キーワードの使用（標準推奨）
シェルプロセス (bash) を \`node\` プロセスに直接置換 (\`exec\`) します。
停止シグナル (\`SIGTERM\` / \`SIGINT\`) が直接 Node.js プロセスに届くため、親プロセス終了に伴うゾンビ化が発生しません。
\`\`\`bash
#!/bin/bash
# start.sh
exec node index.js
\`\`\`

### 解決策 2: シグナルトラップ (\`trap\`) による子プロセス管理
事前に環境構築やログ出力等の前処理が必要な場合、\`trap\` を使用してシグナルを受信した際に子プロセス PID に強制終了命令を発行します。
\`\`\`bash
#!/bin/bash
# start.sh
trap 'kill -TERM "$PID"; wait "$PID"' TERM INT EXIT

node index.js &
PID=$!
wait "$PID"
\`\`\`

---

## 5. マルチプラットフォーム デプロイ仕様 (Deployment Options)

### 5.1 Render (バックエンド API)
- **Environment**: Node
- **Build Command**: \`npm run build:server\`
- **Start Command**: \`npm run start:server\`
- **Environment Variable**: \`SERVE_STATIC=false\`, \`CORS_ORIGIN=*\`

### 5.2 Vercel / Netlify (フロントエンド Web サイト)
- **Framework Preset**: Vite
- **Build Command**: \`npm run build:client\`
- **Output Directory**: \`dist\`
- **Environment Variable**: \`VITE_API_URL\` = (バックエンド API サーバーのドメイン)

### 5.3 Docker / VPS
付属の \`Dockerfile\` および \`docker-compose.yml\` を使用し、独立コンテナとして実行。
\`\`\`bash
docker compose up -d --build
\`\`\`

---

## 6. 持続化ストレージ & サンドボックス構造 (Persistence & Sandbox)

- **環境変数 \`DATA_DIR\`**: 永続化ストレージの基本パス (デフォルト: \`./data\`)
- **Primary State File**: \`\${DATA_DIR}/server_state.json\`
- **Process Isolated Directory**: \`\${DATA_DIR}/processes/<programId>/\`
  - プロセス実行時、全構成ファイルが個別の隔離ディレクトリに自動デプロイされ、\`cwd\` として隔離実行されます。

---

## 7. 主要 REST API エンドポイント (API Reference)

| メソッド | パス | 説明 | ネットワーク最適化パラメータ |
| :--- | :--- | :--- | :--- |
| \`GET\` | \`/api/status\` | システム状態・CPU・メモリ・Uptime 取得 | - |
| \`GET\` | \`/api/sync\` | システム状態と全プログラムデータの取得 | \`?light=true\` (軽量モード) |
| \`POST\` | \`/api/sync\` | クライアント設定の双方向同期 | - |
| \`POST\` | \`/api/programs\` | プログラム・構成ファイルの新規保存・更新 | - |
| \`DELETE\` | \`/api/programs/:id\` | プログラムと隔離ディレクトリの削除 | - |
| \`POST\` | \`/api/programs/:id/run\` | プログラムの手動実行起動 | - |
| \`POST\` | \`/api/programs/:id/stop\` | 実行中プロセスの安全停止 | - |
| \`POST\` | \`/api/railway/vars\` | 共通環境変数の適用 | - |

---

## 8. 環境変数仕様 (Environment Variables)

- \`PORT\`: サーバー受付ポート (デフォルト: \`3000\`)
- \`SERVE_STATIC\`: \`false\` で API 専用モード、\`true\` で静的ファイル同梱モード
- \`CORS_ORIGIN\`: 許可する CORS オリジン (デフォルト: \`*\`)
- \`DATA_DIR\`: 永続ストレージの保存パス (デフォルト: \`./data\`)
- \`GEMINI_API_KEY\`: AI 機能用の API キー
`;

    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TECHNICAL_SPEC.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
              <FileText className="w-3.5 h-3.5" />
              <span>システム公式仕様書 v2.0 (マルチファイル対応)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              ユニバーサル Node.js サーバー管理システム 技術仕様書
            </h2>
            <p className="text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
              プロセス分離型ストレージ、マルチコードファイル管理、プロセス残留対策、Render / Vercel / Railway / Docker 完全対応の分離構成を含む最新技術ドキュメントです。
            </p>
          </div>

          <button
            onClick={downloadMarkdown}
            className="self-start sm:self-auto flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all active:scale-95 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Markdown 仕様書をダウンロード</span>
          </button>
        </div>
      </div>

      {/* Grid Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Timeout Removal Engine */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">1. タイムアウト制限解除仕様 (無制限実行)</h3>
              <p className="text-xs text-slate-400 font-mono">No Execution Timeout</p>
            </div>
          </div>
          <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <p>
              従来のタイマー判定による強制終了処理を全廃し、無制限での連続実行が可能になりました。
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>長時間バッチ処理・リアルタイムデータ監視・スクレイピングに対応。</li>
              <li>「停止」ボタン押下または手動停止API要求時のみ安全にkillシグナルを発行。</li>
            </ul>
          </div>
        </div>

        {/* 2. Process Directory Inspector */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">2. プロセスディレクトリ内表示 & 検査</h3>
              <p className="text-xs text-slate-400 font-mono">/data/processes/&lt;programId&gt;/</p>
            </div>
          </div>
          <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <p>
              プロセスごとに隔離生成されるディレクトリ内の全構成ファイルおよび生成データをリアルタイム確認。
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>API <code className="bg-slate-800 text-slate-200 px-1 py-0.5 rounded font-mono">GET /api/programs/:id/directory</code> でファイル構造を再帰走査。</li>
              <li>「フォルダ内」モーダルでファイルサイズ・更新日時・テキスト内容プレビューを表示。</li>
            </ul>
          </div>
        </div>

        {/* 3. Memory Optimization */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">3. メモリ高消費の原因分析 & 最適化設計</h3>
              <p className="text-xs text-slate-400 font-mono">V8 Heap & Array Memory Caps</p>
            </div>
          </div>
          <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <p>
              子プロセスのSTDOUT/STDERR大量出力によるV8 Heap肥大化を根本解決。
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>ログ出力文字列の自動切り詰め (1行あたり最大1,500文字)。</li>
              <li>グローバルログ保持数の上限厳格化 (最大200件に制限)。</li>
              <li>子プロセス終了時のイベントリスナー参照完全解放。</li>
            </ul>
          </div>
        </div>

        {/* 4. Double Execution Prevention */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">4. 二重稼働防止ガード & UI制御仕様</h3>
              <p className="text-xs text-slate-400 font-mono">UI Locking & HTTP 409 Conflict</p>
            </div>
          </div>
          <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <p>
              同時実行や二重ボタン連打によるプロセス重複アクティビティを完全にガード。
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>処理中 (<code className="bg-slate-800 text-slate-200 px-1 py-0.5 rounded font-mono">isProcessing</code>) または実行中はボタンを無効化 (<code className="bg-slate-800 text-slate-200 px-1 py-0.5 rounded font-mono">disabled</code>)。</li>
              <li>重複要求に対しサーバーは HTTP <code className="bg-slate-800 text-slate-200 px-1 py-0.5 rounded font-mono">409 Conflict</code> を返却。</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Server & Client Separation & Multi-Platform Deployment Section */}
      <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-indigo-950/60 border border-indigo-500/30 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>サーバー・クライアント完全分離 & マルチプラットフォーム対応</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                v3.0.0
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Railway 依存を解除し、Render, Fly.io, Vercel, Netlify, Docker, VPS など任意の環境で独立動作可能。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-indigo-400 block">1. バックエンド (API サーバー)</span>
            <p className="text-xs text-slate-400 leading-relaxed">
              `npm run start:server` (`SERVE_STATIC=false`) で単体APIサーバーとして稼働。Render, Fly.io, VPS, Docker に最適。
            </p>
            <div className="p-2 rounded bg-slate-900 font-mono text-[11px] text-indigo-300">
              npm run start:server
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-emerald-400 block">2. フロントエンド (Web 画面)</span>
            <p className="text-xs text-slate-400 leading-relaxed">
              `npm run build:client` で静的ファイル化。Vercel, Netlify, Cloudflare Pages やローカル環境で高速配信。
            </p>
            <div className="p-2 rounded bg-slate-900 font-mono text-[11px] text-emerald-300">
              npm run build:client
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-purple-400 block">3. 一括コンテナ化 (Docker)</span>
            <p className="text-xs text-slate-400 leading-relaxed">
              付属の `Dockerfile` と `docker-compose.yml` で自作VPSやクラウドコンテナ環境に1発デプロイ可能。
            </p>
            <div className="p-2 rounded bg-slate-900 font-mono text-[11px] text-purple-300">
              docker compose up -d
            </div>
          </div>
        </div>
      </div>

      {/* REST API Endpoints Specification */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center space-x-3">
          <Layers className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-slate-100">5. REST API エンドポイント</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">メソッド</th>
                <th className="py-2.5 px-3">エンドポイント</th>
                <th className="py-2.5 px-3">説明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold">GET</td>
                <td className="py-2.5 px-3 font-mono text-slate-200">/api/system/status</td>
                <td className="py-2.5 px-3">Railwayコンテナのメモリ・稼働時間・CPUステータス取得</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold">GET</td>
                <td className="py-2.5 px-3 font-mono text-slate-200">/api/state</td>
                <td className="py-2.5 px-3">全プログラム (複数ファイル構造含む)、スケジュール、ログを一括取得</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-indigo-400 font-semibold">POST</td>
                <td className="py-2.5 px-3 font-mono text-slate-200">/api/state/sync</td>
                <td className="py-2.5 px-3">クライアントローカル状態をRailwayサーバーへ同期保存</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-indigo-400 font-semibold">POST</td>
                <td className="py-2.5 px-3 font-mono text-slate-200">/api/programs</td>
                <td className="py-2.5 px-3">新規プログラム登録 / 複数ソースコード構成の更新</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-rose-400 font-semibold">DELETE</td>
                <td className="py-2.5 px-3 font-mono text-slate-200">/api/programs/:id</td>
                <td className="py-2.5 px-3">プログラムおよびプロセス分離ディレクトリの削除</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-indigo-400 font-semibold">POST</td>
                <td className="py-2.5 px-3 font-mono text-slate-200">/api/programs/:id/run</td>
                <td className="py-2.5 px-3">指定プログラムをプロセス分離ディレクトリで即座に実行</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-indigo-400 font-semibold">POST</td>
                <td className="py-2.5 px-3 font-mono text-slate-200">/api/programs/:id/stop</td>
                <td className="py-2.5 px-3">実行中プロセスを停止</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
