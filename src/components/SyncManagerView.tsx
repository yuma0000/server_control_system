import React, { useState } from 'react';
import { 
  RefreshCw, 
  Download, 
  Upload, 
  Database, 
  CheckCircle2, 
  Server, 
  FileText,
  Globe,
  Wifi,
  Zap,
  HelpCircle,
  Code2,
  Sliders,
  Check,
  AlertTriangle
} from 'lucide-react';
import { Program, RailwayEnvVar, SystemStatus } from '../types';

interface SyncManagerViewProps {
  programs: Program[];
  railwayEnvVars: RailwayEnvVar[];
  systemStatus: SystemStatus | null;
  onSync: () => Promise<void>;
  onExportBackup: () => void;
  onImportBackup: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isSyncing: boolean;
  lastSyncedAt: string;
  // Network optimization & Separation settings
  customApiBaseUrl: string;
  onSaveApiBaseUrl: (url: string) => void;
  pollIntervalSec: number;
  onSavePollIntervalSec: (sec: number) => void;
  useLightSync: boolean;
  onToggleLightSync: (enabled: boolean) => void;
}

export const SyncManagerView: React.FC<SyncManagerViewProps> = ({
  programs,
  railwayEnvVars,
  systemStatus,
  onSync,
  onExportBackup,
  onImportBackup,
  isSyncing,
  lastSyncedAt,
  customApiBaseUrl,
  onSaveApiBaseUrl,
  pollIntervalSec,
  onSavePollIntervalSec,
  useLightSync,
  onToggleLightSync
}) => {
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [tempApiUrl, setTempApiUrl] = useState<string>(customApiBaseUrl);
  const [urlSaveMsg, setUrlSaveMsg] = useState<string | null>(null);

  const handleManualSync = async () => {
    await onSync();
    setSyncSuccessMsg('Railway サーバーとの同期が完了しました！データはコンテナに正常保存されました。');
    setTimeout(() => setSyncSuccessMsg(null), 4000);
  };

  const handleApplyApiUrl = () => {
    onSaveApiBaseUrl(tempApiUrl);
    setUrlSaveMsg('API接続先URLを更新しました。設定はローカルに保存されました。');
    setTimeout(() => setUrlSaveMsg(null), 3000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            通信量削減 & サーバー / ローカル分離ポータル
          </div>
          <h3 className="text-xl font-bold text-slate-100">
            データ同期 & Railway ネットワーク制限対策マネージャー
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl">
            Railwayのネットワーク上限回避（サーバー/ローカルサイト分離・圧縮・軽量ポーリング）およびデータ持続化の最適化設定を行えます。
          </p>
        </div>

        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? '同期処理中...' : '手動同期を実行'}</span>
        </button>
      </div>

      {syncSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{syncSuccessMsg}</span>
        </div>
      )}

      {/* Railway Network Limits & Local Site Separation Section */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>サーバー（Railway API）とローカル（Webサイト）の分離設定</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] border border-indigo-500/30">
                  Railway 通信量大幅削減
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Webサイトの画面（HTML/JS/CSS）をローカル環境で動かし、RailwayをバックエンドAPI専用にすることで、Railwayの転送量を100%カットできます。
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Custom API URL Setting */}
          <div className="lg:col-span-2 bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                <Wifi className="w-4 h-4 text-indigo-400" />
                <span>Railway バックエンド API URL (接続先)</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">CORS対応済み</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={tempApiUrl}
                onChange={(e) => setTempApiUrl(e.target.value)}
                placeholder="例: https://your-railway-app.up.railway.app (空欄 = 同一サーバー)"
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                onClick={handleApplyApiUrl}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-all shrink-0"
              >
                接続先保存
              </button>
            </div>

            {urlSaveMsg && (
              <p className="text-[11px] text-emerald-400 flex items-center space-x-1 font-medium">
                <Check className="w-3.5 h-3.5" />
                <span>{urlSaveMsg}</span>
              </p>
            )}

            <div className="p-3.5 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-indigo-300">💡 サーバーとローカルサイトを分離する手順:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400">
                <li>本ローカルWeb画面またはVercel等の無料静的ホスティングで画面を開きます。</li>
                <li>上の入力欄にあなたの Railway サーバーのURL（例: <code className="text-indigo-300 font-mono">https://xxx.up.railway.app</code>）を設定します。</li>
                <li>Railway 側で環境変数 <code className="text-indigo-300 font-mono">SERVE_STATIC=false</code> を設定すると、Railwayは静的ファイルを配信せずAPI専用として動作し、ネットワーク転送量を最小限に抑えます。</li>
              </ol>
            </div>
          </div>

          {/* Polling Rate & Light Sync Control */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
            <div>
              <h5 className="text-xs font-bold text-slate-200 flex items-center space-x-2 mb-3">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>通信頻度・軽量ポーリング制御</span>
              </h5>

              {/* Interval Buttons */}
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400">更新間隔 (Railwayへのリクエスト頻度):</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '3秒 (標準)', val: 3 },
                    { label: '5秒 (軽量)', val: 5 },
                    { label: '15秒 (省電力)', val: 15 },
                    { label: '30秒 (超節約)', val: 30 },
                    { label: '停止 (手動のみ)', val: 0 }
                  ].map((item) => (
                    <button
                      key={item.val}
                      onClick={() => onSavePollIntervalSec(item.val)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                        pollIntervalSec === item.val
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Light Sync Toggle */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 block">軽量同期モード (?light=true)</span>
                <span className="text-[10px] text-slate-400">コード全文を省いて通信量を95%削減</span>
              </div>
              <button
                onClick={() => onToggleLightSync(!useLightSync)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  useLightSync ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    useLightSync ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* start.sh -> node index.js Process Leak Solution Guide */}
      <div className="bg-slate-900/90 rounded-2xl border border-amber-500/30 p-6 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-100 text-sm flex items-center space-x-2">
              <span>`start.sh` から `node index.js` を実行した際のプロセス残留解決ガイド</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                トラブルシューティング
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              `start.sh` 停止時に `node index.js` がバックグラウンドに残ってしまう理由と解決方法です。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Solution 1: exec keyword */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> 解決策 1: `exec` キーワード（推奨・最も簡単）
              </span>
              <span className="text-[10px] text-slate-500 font-mono">1行で完了</span>
            </div>
            <p className="text-xs text-slate-400">
              `start.sh` 内で `node index.js` の前に <code className="text-emerald-300 font-mono font-bold">exec</code> を追加します。
              `exec` を使うと、bashプロセスが node プロセスに直接置き換わるため、停止シグナル（SIGTERM）が直接 node に伝わりプロセスが残留しません。
            </p>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-300">
              <p className="text-slate-500"># start.sh</p>
              <p className="font-bold">exec node index.js</p>
            </div>
          </div>

          {/* Solution 2: Trap Signals */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" /> 解決策 2: シグナルトラップ (`trap`)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">事前処理がある場合</span>
            </div>
            <p className="text-xs text-slate-400">
              `start.sh` 内で前処理やログ出力を行う場合は、bash の `trap` 機能で停止要求を受け取った際に子 PID を確実に kill させます。
            </p>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-indigo-300 space-y-0.5">
              <p className="text-slate-500">#!/bin/bash</p>
              <p>trap 'kill -TERM "$PID"; wait "$PID"' TERM INT</p>
              <p>node index.js &amp;</p>
              <p>PID=$!</p>
              <p>wait "$PID"</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Diagram & Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client Storage Status */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm">Webクライアント保存域</h4>
                <p className="text-xs text-slate-400">ブラウザ内 LocalStorage / State</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              クライアント
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">保存済みプログラム数:</span>
              <span className="font-bold text-slate-200">{programs.length} 件</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">登録済み環境変数:</span>
              <span className="font-bold text-slate-200">{railwayEnvVars.length} 個</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">状態:</span>
              <span className="text-emerald-400 font-semibold flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 正常に保護されています
              </span>
            </div>
          </div>
        </div>

        {/* Railway Container Disk Status */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm">Railway サーバーディスク</h4>
                <p className="text-xs text-slate-400">/data/server_state.json</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Railway Server
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">最終同期日時:</span>
              <span className="font-mono text-purple-300">
                {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString('ja-JP') : '未同期'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">起動時オートロード:</span>
              <span className="text-emerald-400 font-semibold">有効 (Automatic Boot Sync)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">コンテナ稼働時間:</span>
              <span className="font-mono text-slate-300">
                {Math.floor((systemStatus?.serverUptimeSec || 0) / 60)} 分
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Backup Import & Export Section */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-4">
        <div>
          <h4 className="font-bold text-slate-100 text-sm flex items-center space-x-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>ファイルバックアップ & リストア</span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            全プログラム・スケジュール・環境変数をJSONファイルとしてPCに保存し、いつでも復元できます。
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Export Button */}
          <button
            onClick={onExportBackup}
            className="p-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-all space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                <Download className="w-4 h-4" />
              </div>
              <span className="text-[11px] text-slate-500 font-mono">.json</span>
            </div>
            <div>
              <h5 className="font-bold text-slate-200 text-xs group-hover:text-indigo-300">バックアップJSONをエクスポート</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">登録データを1ファイルにまとめてローカル保存します</p>
            </div>
          </button>

          {/* Import Upload */}
          <label className="p-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-all space-y-2 cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform">
                <Upload className="w-4 h-4" />
              </div>
              <span className="text-[11px] text-slate-500 font-mono">.json</span>
            </div>
            <div>
              <h5 className="font-bold text-slate-200 text-xs group-hover:text-purple-300">バックアップJSONをインポート</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">保存された設定ファイルを読み込んで復元します</p>
            </div>
            <input
              type="file"
              accept=".json"
              onChange={onImportBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
