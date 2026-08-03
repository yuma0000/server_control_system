# Railway サーバー管理システム (Railway Server Management Portal) 技術仕様書

## 1. システム概要 (System Overview)
本システムは、**Railway パース (PaaS)** クラウド環境上でマルチ言語プログラム (Node.js, Python, Bash, PHP, Ruby) をサンドボックス安全に実行・停止・管理・時間指定予約 (スケジュール) 実行し、ログ確認や環境変数の動的制御を行うための統合管理ポータルシステムです。
最新のアップデートにより、**1つのプロセスに対する複数ファイルの組み込み (マルチコード)、プロセス分離型ストレージ、ファイル読込機能、ファイル名変更、コード折りたたみ表示** に対応しました。

---

## 2. アーキテクチャ & 持続化設計 (Architecture & Persistence)
Railway はコンテナの再起動や再デプロイ時にエフェメラル (一時的) なファイルシステムが初期化される特性を持っています。本システムではこの課題を解決するため、**ハイブリッド同期持続化モデル (Client-Server State Sync)** を採用しています。

- **Primary State Storage**: `/data/server_state.json`
- **Process Isolated Storage**: `/data/processes/<programId>/` (各プロセス専用のストレージディレクトリ)
- **Backup / Source of Truth (Client)**: ブラウザの `localStorage` (`RAILWAY_SERVER_MGMT_STATE_V1`)
- **同期メカニズム**:
  1. **Boot Sync**: Railway 起動時、サーバ内にデータが無い場合クライアントがバックアップを自動適用。
  2. **Manual & Periodical Sync**: Web UI からワンクリックでプログラム設定・スケジューラ設定を双方向同期。

---

## 3. マルチファイル & プロセス分離ストレージ (Multi-File & Isolated Storage)
1つのプロセスに複数のプログラムコードやデータファイルを取り込むことができます。

- **データ構造 (`Program` & `CodeFile`)**:
  - `files: CodeFile[]` (`id`, `filename`, `content`, `isEntry`)
  - `isEntry === true` のファイルが実行時のメインエントリーポイントとなります。
- **プロセス分離ディレクトリ**:
  - プロセス実行時、`/data/processes/<programId>/` 配下に全構成ファイルが書き出されます。
  - プロセス削除時には該当ディレクトリ内のファイルも安全に消去されます。
- **外部ファイル読み込み (File Reader / Upload)**:
  - ローカルPC上のコードや設定ファイル (JS, Python, Shell, JSON, CSV, TXT等) をダイレクトにプロセス内へ読み込み可能。
- **ファイル名の動的変更 (Filename Editor)**:
  - UI上で各ファイルのファイル名を自由に書き換え可能。
- **コード折りたたみ表示 (Collapsible Code UI)**:
  - エディタおよびカードUI上でアコーディオン表示 (折りたたみ/展開) が可能で、長大なコードや複数ファイルがあっても見やすいレイアウトを実現。

---

## 4. サンドボックス実行エンジン (Sandbox Execution Engine)
- **非同期プロセス管理**: `child_process.spawn` を使用し、プロセス分離ディレクトリ (`cwd: /data/processes/<programId>`) を作業ディレクトリとして実行。
- **対応言語と実行環境**:
  - **Node.js**: `node <entry_file>`
  - **Python**: `python3 <entry_file>`
  - **Bash**: `bash <entry_file>`
  - **PHP**: `php <entry_file>`
  - **Ruby**: `ruby <entry_file>`
- **ログ収集**: `stdout` / `stderr` をリアルタイムキャプチャし、最大500行まで保持。

---

## 5. 時間指定スケジューラー (Scheduler System)
- **精度**: 毎分00秒のタイマーチェック (`setInterval` 10秒精度のポーリング)。
- **重複実行防止**: 指定時刻にすでに該当プログラムが `RUNNING` 状態である場合、多重実行を回避しログにスキップ記録。
- **ワンショット・繰り返し実行**: 設定された指定時刻 (HH:MM) に自動起動。

---

## 6. Railway API & 環境変数連携
- **Railway API 統合**: Railway トークンとプロジェクトIDを設定することで、外部から環境変数の取得・更新が可能。
- **プロセス環境変数への自動反映**: プロセス毎に設定された環境変数およびグローバル環境変数は、実行時にプロセスへ注入。

---

## 7. REST API エンドポイント一覧 (API Endpoints)
- `GET /api/system/status` : メモリ・Uptime・接続状況取得
- `GET /api/state` : プログラム・スケジュール・ログデータ取得
- `POST /api/state/sync` : クライアントからの状態一括同期
- `POST /api/programs` : プログラム (複数ファイル含む) 作成・編集
- `DELETE /api/programs/:id` : プログラム & プロセスディレクトリ削除
- `POST /api/programs/:id/run` : プログラム手動実行
- `POST /api/programs/:id/stop` : 実行中プログラム強制停止
- `POST /api/schedules` : スケジュール設定更新
- `POST /api/railway/variables` : Railway環境変数更新

---

## 8. モバイル・レスポンシブ最適化 (Mobile Responsiveness)
- Breakpoints: Tailwind CSS `sm` (640px), `md` (768px), `lg` (1024px)
- **ドロワー型サイドバー**: スマホ画面ではハンバーガーメニューから呼び出すスライドイン方式を採用。
- **タッチターゲット**: 全ボタン最小 44px の高さを確保し、モバイル操作性を確保。
