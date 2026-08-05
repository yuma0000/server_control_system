import React from 'react';
import { 
  Play, 
  Square, 
  RefreshCw, 
  Code2, 
  Clock, 
  Activity, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Cpu, 
  HardDrive,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Program, LogEntry, SystemStatus } from '../types';

interface DashboardViewProps {
  programs: Program[];
  logs: LogEntry[];
  systemStatus: SystemStatus | null;
  onRunProgram: (id: string) => void;
  onStopProgram: (id: string) => void;
  onOpenEditModal: (program: Program) => void;
  onSync: () => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  programs,
  logs,
  systemStatus,
  onRunProgram,
  onStopProgram,
  onOpenEditModal,
  onSync,
  onNavigateTab
}) => {
  const runningPrograms = programs.filter(p => p.status === 'RUNNING');
  const scheduledPrograms = programs.filter(p => p.schedule?.enabled);
  const successPrograms = programs.filter(p => p.status === 'SUCCESS');
  const failedPrograms = programs.filter(p => p.status === 'FAILED');

  const recentLogs = logs.slice(0, 6);

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Alert / Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/60 via-slate-900 to-purple-950/60 border border-indigo-500/30 p-4 sm:p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] sm:text-xs font-medium border border-indigo-500/30">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              Railway Sandboxed Execution Portal
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              サーバープログラム統合管理 & スケジューラー
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              登録したプログラムを隔離サンドボックスで安全に実行・停止・時間指定予約します。Railwayサーバー再起動時の自動同期とライブログ確認に対応。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto">
            <button
              onClick={onSync}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Railway同期</span>
            </button>
            <button
              onClick={() => onNavigateTab('programs')}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs flex items-center justify-center space-x-2 transition-all active:scale-95"
            >
              <Code2 className="w-4 h-4 text-indigo-400" />
              <span>プログラム一覧</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: System Status */}
        <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Railway コンテナ</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100 flex items-baseline space-x-2">
              <span>稼働中</span>
              <span className="text-xs font-normal text-emerald-400">オンライン</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Uptime: {Math.floor((systemStatus?.serverUptimeSec || 0) / 60)}分 ({systemStatus?.serverUptimeSec || 0}秒)
            </p>
          </div>
        </div>

        {/* Metric 2: Registered Programs */}
        <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">登録プログラム</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Code2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100 flex items-baseline space-x-2">
              <span>{programs.length}</span>
              <span className="text-xs font-normal text-slate-400">個</span>
            </div>
            <div className="flex items-center space-x-3 mt-1 text-[11px]">
              <span className="text-emerald-400 font-medium">実行中: {runningPrograms.length}</span>
              <span className="text-slate-400">正常終了: {successPrograms.length}</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Scheduled Tasks */}
        <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">時間指定スケジュール</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100 flex items-baseline space-x-2">
              <span>{scheduledPrograms.length}</span>
              <span className="text-xs font-normal text-slate-400">件 予約済み</span>
            </div>
            <p className="text-[11px] text-purple-300 mt-1 flex items-center">
              <Zap className="w-3 h-3 mr-1 text-purple-400" />
              重複防止 (実行中ならスキップ) 有効
            </p>
          </div>
        </div>

        {/* Metric 4: System Resource Usage */}
        <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">メモリ使用量 (V8)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100 flex items-baseline space-x-2">
              <span>{systemStatus?.heapUsedMb || systemStatus?.memoryUsageMb || 0} MB</span>
              <span className="text-xs font-normal text-slate-400">Heap Used</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
              <span>Total: {systemStatus?.heapTotalMb || 0} MB</span>
              <span>RSS: {systemStatus?.rssMb || 0} MB</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(10, (((systemStatus?.heapUsedMb || systemStatus?.memoryUsageMb || 0)) / 256) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Memory Usage Analysis & Mitigation Report Card */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-3 shadow-lg">
        <div className="flex items-center space-x-3 pb-2 border-b border-slate-800">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-100 text-sm">メモリ使用量の原因分析 & 最適化レポート</h4>
            <p className="text-xs text-slate-400">Node.jsプロセス管理システムにおけるメモリ肥大化の主な要因と本リリースで実施した最適化対策</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <span className="font-bold text-amber-300 flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>メモリ高消費の主な要因 (原因)</span>
            </span>
            <ul className="space-y-1.5 text-slate-300 list-disc list-inside text-[11px] leading-relaxed">
              <li><strong className="text-slate-100">大量ログ出力の配列保持:</strong> プロセスが標準出力(STDOUT/STDERR)へ大量ログを出力した際、メモリ上の配列に溜め込まれV8 Heapを消費。</li>
              <li><strong className="text-slate-100">子プロセスの長文字列バッファ:</strong> 巨大なログ文字列がオブジェクトとして連続確保されGC(ガベージコレクション)が追いつかない現象。</li>
              <li><strong className="text-slate-100">Node.js V8ヒープ事前確保:</strong> V8エンジンが高速化のためにプロセス起動時にRSS (Resident Set Size)を事前に大きく割り当てる仕様。</li>
            </ul>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <span className="font-bold text-emerald-300 flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>実施済みのメモリ最適化対策</span>
            </span>
            <ul className="space-y-1.5 text-slate-300 list-disc list-inside text-[11px] leading-relaxed">
              <li><strong className="text-slate-100">ログ出力文字列切り詰める (最大1,500文字):</strong> 超過ログは自動切詰めでHeap暴走を阻止。</li>
              <li><strong className="text-slate-100">グローバルログ上限の厳格化 (200件):</strong> 配列最大要素数を絞りメモリリークを抑止。</li>
              <li><strong className="text-slate-100">ストリームリスナーの明示的解放:</strong> 子プロセス終了時にSTDOUT/STDERRリスナーをクリーンアップ。</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Programs Summary (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-100 text-sm flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span>主要プログラムと実行状態</span>
              </h4>
              <p className="text-xs text-slate-400">ワンクリックで起動・停止・編集が可能です</p>
            </div>
            <button
              onClick={() => onNavigateTab('programs')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
            >
              <span>すべて表示 ({programs.length})</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {programs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                登録済みのプログラムはありません。「新規プログラム登録」から作成してください。
              </div>
            ) : (
              programs.slice(0, 5).map((program) => (
                <div key={program.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-200 text-sm truncate">{program.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                        {program.language}
                      </span>
                      {program.schedule?.enabled && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center">
                          <Clock className="w-2.5 h-2.5 mr-1" />
                          {program.schedule.timeStr}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{program.description}</p>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    {/* Status Badge */}
                    <div>
                      {program.status === 'RUNNING' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                          実行中
                        </span>
                      )}
                      {program.status === 'SUCCESS' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                          正常終了
                        </span>
                      )}
                      {program.status === 'FAILED' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3 h-3 mr-1 text-rose-400" />
                          エラー発生
                        </span>
                      )}
                      {program.status === 'IDLE' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-400 border border-slate-800">
                          待機中
                        </span>
                      )}
                      {program.status === 'STOPPED' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          停止済み
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {program.status === 'RUNNING' ? (
                      <button
                        onClick={() => onStopProgram(program.id)}
                        className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 transition-all"
                        title="プログラム停止"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onRunProgram(program.id)}
                        className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-all"
                        title="手動実行"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}

                    <button
                      onClick={() => onOpenEditModal(program)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                    >
                      編集
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Live Logs Feed (1 Col) */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-100 text-sm flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>最新実行ログ</span>
              </h4>
              <button
                onClick={() => onNavigateTab('logs')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                ログ画面へ
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1 font-mono text-xs">
              {recentLogs.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-950 text-slate-500 text-center text-xs">
                  まだ実行ログはありません。
                </div>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-indigo-400 font-semibold">{log.programName}</span>
                      <span className="text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString('ja-JP')}
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 mt-0.5 ${
                        log.level === 'ERROR' || log.level === 'STDERR' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        log.level === 'SKIP' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        log.level === 'STDOUT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {log.level}
                      </span>
                      <p className="text-slate-300 text-[11px] leading-tight break-all">
                        {log.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>全ログ件数: {logs.length} 件</span>
            <span className="text-emerald-400 font-medium">リアルタイム記録中</span>
          </div>
        </div>
      </div>
    </div>
  );
};
