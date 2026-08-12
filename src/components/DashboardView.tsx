import React from 'react';
import { Play, Square, Code2, Clock, Terminal, Activity, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Program, LogEntry, SystemStatus } from '../types';

interface DashboardViewProps {
  programs: Program[];
  logs: LogEntry[];
  systemStatus: SystemStatus | null;
  onRunProgram: (id: string) => void;
  onStopProgram: (id: string) => void;
  onOpenEditModal: (program: Program) => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  programs,
  logs,
  systemStatus,
  onRunProgram,
  onStopProgram,
  onOpenEditModal,
  onNavigateTab
}) => {
  const runningPrograms = programs.filter(p => p.status === 'RUNNING');
  const scheduledPrograms = programs.filter(p => p.schedule?.enabled);
  const recentLogs = logs.slice(0, 6);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/60 via-slate-900 to-purple-950/60 border border-indigo-500/30 p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium border border-indigo-500/30">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              Node.js Base Management Portal
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              サーバープログラム統合管理システム
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl">
              プログラムの実行・手動停止・定刻自動起動・リアルタイムログ確認を一元管理します。
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => onNavigateTab('programs')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30"
            >
              プログラム一覧
            </button>
            <button
              onClick={() => onNavigateTab('archive')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs"
            >
              閲覧用アーカイブ (v1)
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase">
            <span>サーバー状態</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">稼働中</div>
          <p className="text-xs text-slate-400">
            Uptime: {Math.floor((systemStatus?.serverUptimeSec || 0) / 60)}分 ({systemStatus?.serverUptimeSec || 0}秒)
          </p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase">
            <span>登録プログラム</span>
            <Code2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{programs.length} <span className="text-xs font-normal text-slate-400">個</span></div>
          <p className="text-xs text-emerald-400 font-medium">現在実行中: {runningPrograms.length} 件</p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase">
            <span>定刻スケジュール</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{scheduledPrograms.length} <span className="text-xs font-normal text-slate-400">件</span></div>
          <p className="text-xs text-purple-300">時間指定の自動実行予約済み</p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase">
            <span>メモリ使用量</span>
            <Terminal className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{systemStatus?.memoryUsageMb || 0} MB</div>
          <p className="text-xs text-slate-400">V8 Heap Memory</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Programs Summary */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-100 text-sm flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-indigo-400" />
              <span>登録プログラム一覧</span>
            </h4>
            <button onClick={() => onNavigateTab('programs')} className="text-xs text-indigo-400 hover:text-indigo-300">
              すべて表示
            </button>
          </div>

          <div className="divide-y divide-slate-800">
            {programs.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                登録されたプログラムはありません。「新規登録」から作成してください。
              </div>
            ) : (
              programs.slice(0, 5).map((prog) => (
                <div key={prog.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-200 text-sm truncate">{prog.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                        {prog.language}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{prog.description}</p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {prog.status === 'RUNNING' ? (
                      <button
                        onClick={() => onStopProgram(prog.id)}
                        className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30"
                        title="停止"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onRunProgram(prog.id)}
                        className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                        title="実行"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}
                    <button
                      onClick={() => onOpenEditModal(prog)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      編集
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Live Logs */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-100 text-sm flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span>最新実行ログ</span>
            </h4>
            <button onClick={() => onNavigateTab('logs')} className="text-xs text-indigo-400 hover:text-indigo-300">
              ログ画面へ
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto font-mono text-xs">
            {recentLogs.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950 text-slate-500 text-center text-xs">
                実行ログはまだありません。
              </div>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-indigo-400 font-semibold">{log.programName}</span>
                    <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString('ja-JP')}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] break-all leading-tight">{log.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
