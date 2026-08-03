import React, { useState } from 'react';
import { 
  RefreshCw, 
  Download, 
  Upload, 
  HardDrive, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  FileText,
  Server,
  Zap,
  ArrowRightLeft
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
}

export const SyncManagerView: React.FC<SyncManagerViewProps> = ({
  programs,
  railwayEnvVars,
  systemStatus,
  onSync,
  onExportBackup,
  onImportBackup,
  isSyncing,
  lastSyncedAt
}) => {
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  const handleManualSync = async () => {
    await onSync();
    setSyncSuccessMsg('Railway サーバーとの同期が完了しました！データはコンテナに正常保存されました。');
    setTimeout(() => setSyncSuccessMsg(null), 4000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            クライアント / Railway 永続化同期エンジン
          </div>
          <h3 className="text-xl font-bold text-slate-100">
            クライアント設定・データ自動同期マネージャー
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl">
            Railwayコンテナの再起動（揮発初期化）に伴う設定喪失を防ぐため、ウェブクライアントとRailwayサーバー間の自動相互同期を行います。
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
