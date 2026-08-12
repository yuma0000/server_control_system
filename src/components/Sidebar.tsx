import React from 'react';
import { LayoutDashboard, Code2, Clock, Terminal, Sliders, FolderArchive, DatabaseBackup, Server, X } from 'lucide-react';
import { SystemStatus } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemStatus: SystemStatus | null;
  runningCount: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  systemStatus,
  runningCount,
  mobileOpen = false,
  onMobileClose
}) => {
  const navItems = [
    { id: 'dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
    { id: 'programs', label: 'プログラム管理', icon: Code2, badge: runningCount > 0 ? `${runningCount} 実行中` : undefined },
    { id: 'scheduler', label: '時間指定スケジュール', icon: Clock },
    { id: 'logs', label: '実行ログ / 監視', icon: Terminal },
    { id: 'env', label: '環境変数設定', icon: Sliders },
    { id: 'backup', label: 'バックアップ & 復元', icon: DatabaseBackup },
    { id: 'archive', label: '閲覧用アーカイブ (v1)', icon: FolderArchive },
  ];

  const content = (
    <div className="flex flex-col h-full justify-between select-none">
      <div>
        {/* Brand */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-100 text-base tracking-tight leading-none">
                Node Server
              </h1>
              <span className="text-[10px] text-indigo-400 font-medium uppercase tracking-wider">
                Management System
              </span>
            </div>
          </div>

          {onMobileClose && (
            <button onClick={onMobileClose} className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Server Status Box */}
        <div className="mx-3 my-4 p-3 rounded-xl bg-slate-800/50 border border-slate-800 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">サーバー 状態</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              稼働中
            </span>
          </div>
          <div className="text-slate-300 font-mono text-[11px] truncate">
            {systemStatus?.platformName || 'Node.js Express Server'}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span>メモリ: {systemStatus?.memoryUsageMb || 0} MB</span>
            <span>Uptime: {Math.floor((systemStatus?.serverUptimeSec || 0) / 60)}分</span>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (onMobileClose) onMobileClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
        <span>Base System</span>
        <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">v3.1.0</span>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 flex-col shrink-0">
        {content}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onMobileClose} />
          <aside className="relative w-72 max-w-[80vw] bg-slate-900 border-r border-slate-800 flex flex-col z-10">
            {content}
          </aside>
        </div>
      )}
    </>
  );
};
