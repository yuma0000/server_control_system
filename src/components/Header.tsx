import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, Clock, Server, Menu, CheckCircle, AlertTriangle } from 'lucide-react';
import { SystemStatus } from '../types';

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

  useEffect(() => {
    const update = () => {
      setTimeStr(new Date().toLocaleTimeString('ja-JP', { hour12: false }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
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

        {/* Server Status Badge */}
        <div className="flex items-center space-x-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
          {systemStatus?.connected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-slate-200 font-medium hidden md:inline">API サーバー 接続完了</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-amber-400 font-medium">再接続中</span>
            </>
          )}
        </div>

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
  );
};
