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
    const markdownContent = `# Railway サーバー管理システム 技術仕様書 (Technical Specifications)

## 1. システム概要 (System Overview)
本システムは、**Railway パース(PaaS)** クラウド環境上でマルチ言語プログラム (Node.js, Python, Bash, PHP, Ruby) をサンドボックス安全に実行・停止・管理・時間指定予約 (スケジュール) 実行し、ログ確認や環境変数の動的制御を行うための統合管理ポータルシステムです。
最新アップデートにより、1つのプロセスに対する複数ファイル構造 (マルチコード・データ)、プロセス分離型ストレージ、ファイル読込機能、ファイル名変更、コード折りたたみ表示に対応しました。

---

## 2. アーキテクチャ & 持続化設計 (Architecture & Persistence)
Railway はコンテナの再起動や再デプロイ時にエフェメラル(一時的)なファイルシステムが初期化される特性を持っています。本システムではこの課題を解決するため、**ハイブリッド同期持続化モデル (Client-Server State Sync)** を採用しています。

- **Primary State Storage**: \`/data/server_state.json\`
- **Process Isolated Storage**: \`/data/processes/<programId>/\` (各プロセス専用のストレージディレクトリ)
- **Backup / Source of Truth (Client)**: ブラウザの \`localStorage\` (\`RAILWAY_SERVER_MGMT_STATE_V1\`)
- **同期メカニズム**:
  1. **Boot Sync**: Railway 起動時、サーバ内にデータが無い場合クライアントがバックアップを自動適用。
  2. **Manual & Periodical Sync**: Web UI からワンクリックでプログラム設定・スケジューラ設定を双方向同期。

---

## 3. マルチファイル & プロセス分離ストレージ (Multi-File & Isolated Storage)
1つのプロセスに複数のプログラムコードやデータファイルを取り込むことができます。

- **データ構造 (\`Program\` & \`CodeFile\`)**:
  - \`files: CodeFile[]\` (\`id\`, \`filename\`, \`content\`, \`isEntry\`)
  - \`isEntry === true\` のファイルが実行時のメインエントリーポイントとなります。
- **プロセス分離ディレクトリ**:
  - プロセス実行時、\`/data/processes/<programId>/\` 配下に全構成ファイルが書き出されます。
  - プロセス削除時には該当ディレクトリ内のファイルも安全に消去されます。
- **外部ファイル読み込み (File Reader / Upload)**:
  - ローカルPC上のコードや設定ファイル (JS, Python, Shell, JSON, CSV, TXT等) をダイレクトにプロセス内へ読み込み可能。
- **ファイル名の動的変更 (Filename Editor)**:
  - UI上で各ファイルのファイル名を自由に書き換え可能。
- **コード折りたたみ表示 (Collapsible Code UI)**:
  - エディタおよびカードUI上でアコーディオン表示 (折りたたみ/展開) が可能で、長大なコードや複数ファイルがあっても見やすいレイアウトを実現。

---

## 4. サンドボックス実行エンジン (Sandbox Execution Engine)
- **非同期プロセス管理**: \`child_process.spawn\` を使用し、プロセス分離ディレクトリ (\`cwd: /data/processes/<programId>\`) を作業ディレクトリとして実行。
- **対応言語と実行環境**:
  - **Node.js**: \`node <entry_file>\`
  - **Python**: \`python3 <entry_file>\`
  - **Bash**: \`bash <entry_file>\`
  - **PHP**: \`php <entry_file>\`
  - **Ruby**: \`ruby <entry_file>\`
- **ログ収集**: \`stdout\` / \`stderr\` をリアルタイムキャプチャし、最大500行まで保持。

---

## 5. 時間指定スケジューラー (Scheduler System)
- **精度**: 毎分00秒のタイマーチェック (\`setInterval\` 10秒精度のポーリング)。
- **重複実行防止**: 指定時刻にすでに該当プログラムが \`RUNNING\` 状態である場合、多重実行を回避しログにスキップ記録。

---

## 6. Railway API & 環境変数連携
- **Railway API 統合**: Railway トークンとプロジェクトIDを設定することで、外部から環境変数の取得・更新が可能。
- **プロセス環境変数への自動反映**: プロセス毎に設定された環境変数およびグローバル環境変数は、実行時にプロセスへ注入。

---

## 7. REST API エンドポイント一覧 (API Endpoints)
- \`GET /api/system/status\` : メモリ・Uptime・接続状況取得
- \`GET /api/state\` : プログラム・スケジュール・ログデータ取得
- \`POST /api/state/sync\` : クライアントからの状態一括同期
- \`POST /api/programs\` : プログラム (複数ファイル含む) 作成・編集
- \`DELETE /api/programs/:id\` : プログラム & プロセスディレクトリ削除
- \`POST /api/programs/:id/run\` : プログラム手動実行
- \`POST /api/programs/:id/stop\` : 実行中プログラム強制停止
- \`POST /api/schedules\` : スケジュール設定更新
- \`POST /api/railway/variables\` : Railway環境変数更新
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
              Railway サーバー管理システム 技術仕様書
            </h2>
            <p className="text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
              プロセス分離型ストレージ、マルチコードファイル管理、ローカルファイルインポート、ファイル名変更、コード折りたたみ表示などの最新仕様を含む技術ドキュメントです。
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
        {/* 1. Multi-File & Isolated Storage */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">1. マルチファイル & プロセス分離ストレージ</h3>
              <p className="text-xs text-slate-400">1プロセス内での複数コード/データ管理</p>
            </div>
          </div>
          <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <p>
              各プロセスは独立した専用ディレクトリ <code className="bg-slate-800 text-slate-200 px-1 py-0.5 rounded font-mono">/data/processes/&lt;programId&gt;/</code> 内で動きます。
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>構成ファイル群: <code className="bg-slate-800 text-slate-200 px-1 py-0.5 rounded font-mono">files: CodeFile[]</code> で複数保持。</li>
              <li>エントリ指定: メインで起動するファイルをUIで星マーク（isEntry）指定。</li>
              <li>ファイル読込: ローカルPCからテキスト・コード類をダイレクトにインポート。</li>
              <li>ファイル名変更: 任意のタイミングでリネーム可能。</li>
            </ul>
          </div>
        </div>

        {/* 2. Collapsible & UI Optimizations */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ChevronDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">2. コード折りたたみ & 視認性最適化</h3>
              <p className="text-xs text-slate-400">アコーディオンUIとマルチファイル切替</p>
            </div>
          </div>
          <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <p>
              大量のコードや複数のファイルをスッキリ管理するための視認性向上機能を搭載。
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>コード折りたたみ: エディタおよびカードでソースコードを1タップ折りたたみ/展開。</li>
              <li>タブ切替: 複数ファイルをスムーズに切り替え可能。</li>
            </ul>
          </div>
        </div>

        {/* 3. Persistence & Sync */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">3. 持続化 & クライアント同期</h3>
              <p className="text-xs text-slate-400">Railway コンテナ再起動対策</p>
            </div>
          </div>
          <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <p>
              Railway のコンテナ初期化問題（Ephemeral Storage）に対応するハイブリッド同期。
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>サーバー保存先: <code className="bg-slate-800 text-slate-200 px-1 py-0.5 rounded font-mono">/data/server_state.json</code></li>
              <li>クライアントバックアップ: ブラウザ <code className="bg-slate-800 text-slate-200 px-1 py-0.5 rounded font-mono">localStorage</code></li>
              <li>手動・自動同期: ボタン1つで双方向同期・バックアップ適用。</li>
            </ul>
          </div>
        </div>

        {/* 4. Sandbox & Scheduler */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">4. 実行エンジン & スケジューラー</h3>
              <p className="text-xs text-slate-400">非同期実行と時間指定制御</p>
            </div>
          </div>
          <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <p>
              Node.js, Python, Bash, PHP, Ruby を分離環境で実行。
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>非ブロッキング: <code className="bg-slate-800 text-slate-200 px-1 py-0.5 rounded font-mono">child_process.spawn</code> で起動。</li>
              <li>時間指定実行: HH:MM 定刻に自動実行。既に実行中なら重複回避スキップ。</li>
            </ul>
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
