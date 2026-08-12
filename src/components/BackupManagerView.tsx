import React, { useState, useRef } from 'react';
import { Download, Upload, DatabaseBackup, CheckCircle2, AlertTriangle, FileJson, RefreshCw, ShieldCheck } from 'lucide-react';
import { Program, LogEntry, ServerEnvVar } from '../types';
import { buildApiUrl, parseJsonResponse } from '../utils/api';

interface BackupManagerViewProps {
  programs: Program[];
  logs: LogEntry[];
  envVars: ServerEnvVar[];
  onRefresh: () => void;
}

export const BackupManagerView: React.FC<BackupManagerViewProps> = ({
  programs,
  logs,
  envVars,
  onRefresh
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export JSON file
  const handleExportBackup = async () => {
    setIsExporting(true);
    setStatusMsg(null);
    try {
      const endpoint = buildApiUrl('/api/backup/export');
      const res = await fetch(endpoint, {
        headers: { 'Accept': 'application/json' }
      });

      const data = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(data.error || `HTTP Error ${res.status}`);
      }

      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `node_server_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMsg({ type: 'success', text: 'バックアップJSONファイルのダウンロードが完了しました。' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `バックアップ出力エラー: ${err.message}` });
    } finally {
      setIsExporting(false);
    }
  };

  // Import JSON file
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setStatusMsg(null);

    try {
      const text = await file.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch (jsonErr: any) {
        throw new Error(`選択されたファイルは有効なJSON形式ではありません (${jsonErr.message})`);
      }

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('バックアップJSONデータの構造が無効です。');
      }

      const endpoint = buildApiUrl('/api/backup/restore');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(parsed)
      });

      const result = await parseJsonResponse(res);

      if (!res.ok) {
        throw new Error(result.error || `復元処理に失敗しました (HTTP ${res.status})`);
      }

      setStatusMsg({
        type: 'success',
        text: `バックアップの復元に成功しました (${result.programCount || 0}件のプログラムを復元)`
      });

      onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `インポートエラー: ${err.message}` });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <DatabaseBackup className="w-5 h-5 text-indigo-400" />
            <span>バックアップ & 復元マネージャー</span>
          </h3>
          <p className="text-xs text-slate-400">
            登録済みプログラム、コードファイル、スケジュール設定、環境変数、実行ログの完全バックアップ（JSON形式）および復元を行います。
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium flex items-center space-x-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          <span>状態更新</span>
        </button>
      </div>

      {/* Notification Toast */}
      {statusMsg && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center space-x-3 ${
          statusMsg.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span className="font-medium">{statusMsg.text}</span>
        </div>
      )}

      {/* Backup Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs text-slate-400 font-medium">対象プログラム数</span>
          <div className="text-2xl font-bold text-slate-100">{programs.length} <span className="text-xs font-normal text-slate-400">個</span></div>
          <p className="text-[11px] text-indigo-400">スクリプト・構成ファイル含む</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs text-slate-400 font-medium">環境変数設定</span>
          <div className="text-2xl font-bold text-slate-100">{envVars.length} <span className="text-xs font-normal text-slate-400">件</span></div>
          <p className="text-[11px] text-purple-400">サーバー共通変数</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs text-slate-400 font-medium">実行ログ保持数</span>
          <div className="text-2xl font-bold text-slate-100">{logs.length} <span className="text-xs font-normal text-slate-400">行</span></div>
          <p className="text-[11px] text-emerald-400">STDOUT / STDERR 記録</p>
        </div>
      </div>

      {/* Main Operations Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-100">バックアップファイルのダウンロード (Export)</h4>
              <p className="text-xs text-slate-400 leading-relaxed mt-1">
                現在のサーバーの全設定・全プログラム・環境変数・実行ログを一括して1つの JSON ファイルとしてローカルに保存します。
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-1">
              <div className="flex items-center space-x-2 text-slate-300 font-semibold">
                <FileJson className="w-4 h-4 text-indigo-400" />
                <span>出力フォーマット: JSON (.json)</span>
              </div>
              <p className="text-[11px] text-slate-500">Render や Vercel 再デプロイ時にも復元可能です。</p>
            </div>
          </div>

          <button
            onClick={handleExportBackup}
            disabled={isExporting}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all active:scale-98 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'バックアップ生成中...' : 'バックアップ JSON をダウンロード'}</span>
          </button>
        </div>

        {/* Import Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-100">バックアップファイルの復元 (Import)</h4>
              <p className="text-xs text-slate-400 leading-relaxed mt-1">
                以前保存したバックアップ JSON ファイルを選択してサーバーへアップロードし、システム状態を完全復元します。
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-1">
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>自動検証 & 安全な上書き復元</span>
              </div>
              <p className="text-[11px] text-slate-500">復元完了後、サーバーディスクへ即時自動同期されます。</p>
            </div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all active:scale-98 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{isImporting ? '復元処理中...' : 'バックアップファイルを選択して復元'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
