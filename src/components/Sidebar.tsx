import React from 'react';
import { 
  LayoutDashboard, 
  Code2, 
  Clock, 
  Terminal, 
  RefreshCw, 
  Sliders,
  Server,
  Activity,
  CheckCircle2,
  FileText,
  X
} from 'lucide-react';
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
    { id: 'logs', label: '実行ログ / 問題確認', icon: Terminal },
    { id: 'sync', label: '同期 & バックアップ', icon: RefreshCw },
    { id: 'railway', label: 'Railway API / 環境変数', icon: Sliders },
    { id: 'spec', label: '技術仕様書 (Docs)', icon: FileText },
  ];

  const content = (
    <div className="flex flex-col h-full justify-between select-none">
      <div>
        {/* Brand Logo & Mobile Close */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-100 text-base tracking-tight leading-none">
                Railway Server
              </h1>
              <span className="text-[11px] text-indigo-400 font-medium tracking-wide uppercase">
                Management Portal
              </span>
            </div>
          </div>

          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Railway Status Indicator */}
        <div className="mx-3 my-4 p-3 rounded-lg bg-slate-800/50 border border-slate-800 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 font-medium">Railway ステータス</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
              稼働中
            </span>
          </div>
          <div className="text-[11px] text-slate-300 font-mono truncate">
            {systemStatus?.railwayServiceName || 'railway-app-container'}
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span>メモリ: {systemStatus?.memoryUsageMb || 0} MB</span>
            <span>Uptime: {Math.floor((systemStatus?.serverUptimeSec || 0) / 60)}m</span>
          </div>
        </div>

        {/* Navigation Items */}
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
                className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
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
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 text-xs text-slate-400 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center">
            <Activity className="w-3 h-3 text-indigo-400 mr-1" />
            自動同期機能
          </span>
          <span className="text-emerald-400 font-medium flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-0.5" />
            有効
          </span>
        </div>
        <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>Portal Version</span>
          <span className="text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">v2.4.0</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 flex-col shrink-0">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={onMobileClose}
          />
          <aside className="relative w-72 max-w-[80vw] bg-slate-900 border-r border-slate-800 flex flex-col z-10 shadow-2xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
};

