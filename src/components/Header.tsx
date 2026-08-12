import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, Clock, Server, Menu, AlertTriangle, Settings, Globe, CheckCircle2, X } from 'lucide-react';
import { SystemStatus } from '../types';
import { getCustomApiUrl, setCustomApiUrl, safeFetch } from '../utils/api';

interface HeaderProps {
  title: string;
  systemStatus: SystemStatus | null;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  isSyncing: boolean;
  onMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  systemStatus,
  onRefresh,
  onOpenCreateModal,
  isSyncing,
  onMenuToggle
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [showServerModal, setShowServerModal] = useState<boolean>(false);
  const [apiUrlInput, setApiUrlInput] = useState<string>('');
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      setTimeStr(new Date().toLocaleTimeString('ja-JP', { hour12: false }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenServerModal = () => {
    setApiUrlInput(getCustomApiUrl());
    setTestResult(null);
    setShowServerModal(true);
  };

  const handleSaveApiUrl = () => {
    setCustomApiUrl(apiUrlInput);
    setShowServerModal(false);
    onRefresh();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await safeFetch('/api/status', undefined, apiUrlInput);
      if (res && res.connected) {
        setTestResult({
          success: true,
          msg: `接続成功！ (プラットフォーム: ${res.platformName || 'Node.js'}, Uptime: ${res.serverUptimeSec}s)`
        });
      } else {
        setTestResult({ success: false, msg: '接続応答が不完全です。' });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        msg: `接続エラー: ${err.message || 'Render サーバーに接続できませんでした。'}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <>
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center space-x-2">
              <span>{title}</span>
            </h2>
            <p className="text-[11px] text-slate-400 hidden sm:block">Node.js API サーバー・プログラム統合管理システム</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Clock */}
          <div className="hidden sm:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{timeStr || '00:00:00'} JST</span>
          </div>

          {/* Server Status Badge / Render Connection Config */}
          <button
            onClick={handleOpenServerModal}
            className="flex items-center space-x-1.5 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs transition-colors"
            title="クリックしてRenderサーバー接続設定を開く"
          >
            {systemStatus === null ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin shrink-0" />
                <span className="text-slate-300 font-medium hidden md:inline">API サーバー確認中...</span>
              </>
            ) : systemStatus?.connected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-slate-200 font-medium hidden md:inline">API サーバー 接続完了</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-amber-400 font-medium">API サーバー 未接続</span>
              </>
            )}
            <Settings className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {/* Sync Button */}
          <button
            onClick={onRefresh}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{isSyncing ? '同期中...' : '手動同期'}</span>
          </button>

          {/* Create Button */}
          <button
            onClick={onOpenCreateModal}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>新規登録</span>
          </button>
        </div>
      </header>

      {/* Render / Server Connection Modal */}
      {showServerModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowServerModal(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <Globe className="w-5 h-5 text-indigo-400" />
                <span>API サーバー接続設定</span>
              </h3>
              <p className="text-xs text-slate-400">
                本アプリは Node.js バックエンドサーバー（Express）と連携してプログラムの実行・管理を行います。同一環境で動作している場合は空欄で接続できます。
              </p>
            </div>

            {/* Render Free Tier Explanation Notice */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1.5">
              <div className="font-semibold flex items-center space-x-1.5 text-amber-200">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Render 無料プランの動作（コールドスタート）</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-200/80">
                Render 無料枠では、15分間無操作状態が続くとインスタンスがスリープ（非アクティブ化）します。初回アクセス時や復元処理時は起動に<strong>約30秒〜50秒</strong>かかり、「再接続中」が表示されます。起動完了後自動的に接続に復帰します。
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">API サーバー URL (例: https://my-app.onrender.com)</label>
              <input
                type="text"
                value={apiUrlInput}
                onChange={(e) => setApiUrlInput(e.target.value)}
                placeholder="空欄の場合は同一次元 (/api) を使用"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {testResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                testResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{testResult.msg}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center space-x-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'テスト中...' : '接続テスト'}</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowServerModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiUrl}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
                >
                  保存して更新
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
