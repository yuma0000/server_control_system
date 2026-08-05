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

最新の仕様改定により、**タイムアウト制限の解除 (無制限実行)**、**プロセス別独立ディレクトリ (/data/processes/<programId>) のファイル一覧・プレビュー機能**、**メモリ消費原因の分析と最適化 (V8 Heap/配列の上限制御)**、および **二重稼働防止のためのUIボタンロックとHTTP 409重複保護** が実装されました。

---

## 2. アーキテクチャ & 持続化設計 (Architecture & Persistence)
Railway はコンテナの再起動や再デプロイ時にエフェメラル(一時的)なファイルシステムが初期化される特性を持っています。本システムではこの課題を解決するため、**ハイブリッド同期持続化モデル (Client-Server State Sync)** を採用しています。

- **Primary State Storage**: \`/data/server_state.json\`
- **Process Isolated Storage**: \`/data/processes/<programId>/\` (各プロセス専用の隔離ストレージディレクトリ)
- **Backup / Source of Truth (Client)**: ブラウザの \`localStorage\` (\`RAILWAY_SERVER_MGMT_STATE_V1\`)

---

## 3. タイムアウト制限解除仕様 (No-Timeout Engine)
- **無制限実行**: 従来の自動強制終了 (30秒〜のタイマー) を全廃。スクレイピングや長時間バッチ処理、リアルタイム監視処理に対応。
- **手動停止保証**: ユーザーによる「停止」ボタン押下、または \`POST /api/programs/:id/stop\` リクエストのみで安全にプロセスを終了可能。

---

## 4. プロセスディレクトリ検査 & ファイル構造 (Process Directory Inspector)
- **ディレクトリ構成**: \`/data/processes/<programId>/\`
- **リアルタイム走査 API**: \`GET /api/programs/:id/directory\`
  - プロセス実行時・終了時に生成されたファイルや生成データを再帰的に走査。
  - ファイル名、相対パス、ファイルサイズ (B/KB/MB)、更新日時、およびインラインプレビューテキストを取得。
- **UIモーダル**: 「フォルダ内」ボタンからプロセス別ディレクトリ構成と生成ファイルをリアルタイム確認可能。

---

## 5. メモリ高消費の原因分析 & 最適化設計 (Memory Usage & Optimization)
- **原因 1 (大容量ログバッファ)**: 子プロセスの \`STDOUT\`/\`STDERR\` からの連続出力が無限配列に積み上がりV8 Heapを過大消費。
- **原因 2 (長文字列バッファの留保)**: 長大なテキスト出力がガベージコレクション(GC)の追従速度を超過。
- **原因 3 (V8ヒープ事前割り当て)**: Node.js V8エンジンが高速化目的で高メモリ(RSS)を確保。
- **最適化対策**:
  1. **ログ文字列切り詰め**: 1行あたり最大1,500文字で切詰、Heap増大を防止。
  2. **グローバルログ上限設定**: 配列要素数を200件に絞り、V8メモリリークを排除。
  3. **ストリームクリーンアップ**: 子プロセス終了時に \`removeAllListeners()\` でストリーム参照を全開放。

---

## 6. 二重稼働防止ガード & UI制御仕様 (Duplicate Run Prevention)
- **UIボタン操作不可**: 処理実行中 (\`isProcessing === true\`)、またはプログラム状態が \`RUNNING\` の場合、「実行」「編集」「削除」「新規作成」ボタンを即座に操作不可 (\`disabled\`) にロック。
- **サーバーAPIガード**: 既に実行中のプロセスに対して \`POST /api/programs/:id/run\` が送信された場合、HTTP \`409 Conflict\` エラーを返し重複起動を拒否。
- **スケジューラスキップ**: 時間指定スケジュール実行時、対象が \`RUNNING\` であればログに \`[SCHEDULE SKIPPED]\` と記録してスキップ。

---

## 7. REST API エンドポイント一覧 (API Endpoints)
- \`GET /api/system/status\` : メモリ(HeapUsed, HeapTotal, RSS)・Uptime・CPU取得
- \`GET /api/state\` : プログラム・スケジュール・ログデータ取得
- \`POST /api/state/sync\` : クライアントからの状態一括同期
- \`POST /api/programs\` : プログラム作成・編集
- \`DELETE /api/programs/:id\` : プログラム & プロセスディレクトリ削除
- \`GET /api/programs/:id/directory\` : プロセス分離ディレクトリ内ファイル一覧＆プレビュー取得
- \`POST /api/programs/:id/run\` : プログラム実行 (二重稼働保護 409 Conflict)
- \`POST /api/programs/:id/stop\` : 実行中プログラム強制停止
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
