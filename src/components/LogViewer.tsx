import React, { useState } from 'react';
import { 
  Terminal, 
  Search, 
  Trash2, 
  Download, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  RefreshCw,
  Info,
  Bug
} from 'lucide-react';
import { LogEntry, Program } from '../types';

interface LogViewerProps {
  logs: LogEntry[];
  programs: Program[];
  onClearLogs: () => void;
  onRefreshLogs: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  programs,
  onClearLogs,
  onRefreshLogs
}) => {
  const [selectedProgramId, setSelectedProgramId] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchProgram = selectedProgramId === 'ALL' || log.programId === selectedProgramId;
    const matchLevel = selectedLevel === 'ALL' || log.level === selectedLevel;
    const matchSearch = log.message.toLowerCase().includes(search.toLowerCase()) ||
                        log.programName.toLowerCase().includes(search.toLowerCase());
    return matchProgram && matchLevel && matchSearch;
  });

  // Extract error and skip entries for problem diagnostics
  const errorLogs = logs.filter(l => l.level === 'ERROR' || l.level === 'STDERR');
  const skipLogs = logs.filter(l => l.level === 'SKIP');

  const handleExportLogsText = () => {
    const textData = filteredLogs.map(l => 
      `[${l.timestamp}] [${l.level}] [${l.programName}]: ${l.message}`
    ).join('\n');

    const blob = new Blob([textData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `railway-execution-logs-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20">
            <Terminal className="w-3.5 h-3.5 mr-1.5" />
            リアルタイムログモニター & 問題検知
          </div>
          <h3 className="text-xl font-bold text-slate-100">
            実行ログ閲覧 & トラブルシューティング
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl">
            サンドボックスでの標準出力（STDOUT）、エラー（STDERR）、スケジュール実行スキップ通知を監視します。
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setShowDiagnostic(!showDiagnostic)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border transition-all ${
              showDiagnostic
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Bug className="w-4 h-4 text-amber-400" />
            <span>問題自動診断 ({errorLogs.length + skipLogs.length})</span>
          </button>

          <button
            onClick={handleExportLogsText}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center space-x-1 transition-all"
            title="ログを出力"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">ログ保存</span>
          </button>

          <button
            onClick={onClearLogs}
            className="px-3 py-2 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 text-xs font-medium flex items-center space-x-1 transition-all"
            title="ログクリア"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">消去</span>
          </button>
        </div>
      </div>

      {/* Problem Inspector Panel (collapsible) */}
      {showDiagnostic && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 space-y-4 animate-fadeIn">
          <div className="flex items-center space-x-2 text-amber-400">
            <Sparkles className="w-5 h-5" />
            <h4 className="font-bold text-sm text-slate-100">問題診断アシスタント結果</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Errors breakdown */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-rose-400 font-semibold">
                <span className="flex items-center">
                  <XCircle className="w-4 h-4 mr-1.5" /> エラー検出ログ ({errorLogs.length}件)
                </span>
              </div>

              {errorLogs.length === 0 ? (
                <p className="text-slate-400 italic">現在エラーログは検出されていません。正常に動作しています。</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {errorLogs.slice(0, 3).map((errLog) => (
                    <div key={errLog.id} className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-200 font-mono text-[11px]">
                      <div className="font-bold text-white mb-0.5">{errLog.programName}</div>
                      <div>{errLog.message}</div>
                    </div>
                  ))}
                  <p className="text-[10px] text-amber-300">
                    💡 対策ヒント: 環境変数の設定漏れや、最大実行時間(timeoutSec)の超過が無いかプログラム設定を確認してください。
                  </p>
                </div>
              )}
            </div>

            {/* Skips breakdown */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-amber-400 font-semibold">
                <span className="flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1.5" /> 重複予約スキップ通知 ({skipLogs.length}件)
                </span>
              </div>

              {skipLogs.length === 0 ? (
                <p className="text-slate-400 italic">スキップされた予約ログはありません。</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {skipLogs.slice(0, 3).map((skipLog) => (
                    <div key={skipLog.id} className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-200 font-mono text-[11px]">
                      <div className="font-bold text-white mb-0.5">{skipLog.programName}</div>
                      <div>{skipLog.message}</div>
                    </div>
                  ))}
                  <p className="text-[10px] text-purple-300">
                    💡 仕様確認: スケジュール時刻に到達した際、対象プログラムがすでに「RUNNING」状態だったためスキップ(何もしない)されました。正常な重複防止動作です。
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="ログメッセージを検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Program Filter */}
        <div>
          <select
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">すべてのプログラム</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Level Filter */}
        <div>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">すべてのログ種別</option>
            <option value="INFO">INFO (システム通知)</option>
            <option value="STDOUT">STDOUT (標準出力)</option>
            <option value="STDERR">STDERR (標準エラー)</option>
            <option value="ERROR">ERROR (致命的エラー)</option>
            <option value="WARN">WARN (警告)</option>
            <option value="SKIP">SKIP (重複スキップ)</option>
          </select>
        </div>
      </div>

      {/* Terminal View Container */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden font-mono text-xs shadow-2xl">
        {/* Terminal Header */}
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span className="ml-2 font-semibold text-slate-300 text-[11px]">Railway Execution Console Output</span>
          </div>

          <div className="flex items-center space-x-3 text-[11px]">
            <span>表示件数: {filteredLogs.length} 件</span>
            <button
              onClick={onRefreshLogs}
              className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>更新</span>
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto selection:bg-indigo-600/40">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              条件に該当するログはありません。
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start space-x-3 py-1 hover:bg-slate-900/60 rounded px-2 transition-colors">
                <span className="text-slate-500 text-[10px] shrink-0 pt-0.5">
                  {new Date(log.timestamp).toLocaleTimeString('ja-JP')}
                </span>

                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 mt-0.5 ${
                  log.level === 'ERROR' || log.level === 'STDERR' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                  log.level === 'SKIP' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  log.level === 'STDOUT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {log.level}
                </span>

                <span className="text-indigo-400 font-semibold shrink-0">
                  [{log.programName}]:
                </span>

                <span className={`break-all leading-relaxed ${
                  log.level === 'ERROR' || log.level === 'STDERR' ? 'text-rose-300 font-medium' :
                  log.level === 'SKIP' ? 'text-amber-200' :
                  log.level === 'STDOUT' ? 'text-emerald-300' : 'text-slate-200'
                }`}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
