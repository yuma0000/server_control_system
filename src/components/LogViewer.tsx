import React, { useState } from 'react';
import { Terminal, Trash2, Search, Filter, RefreshCw } from 'lucide-react';
import { LogEntry, LogLevel } from '../types';

interface LogViewerProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  onRefresh: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  onClearLogs,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.programName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = selectedLevel === 'ALL' || log.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <span>実行ログ / リアルタイム監視 ({filteredLogs.length} / 全{logs.length}件)</span>
          </h3>
          <p className="text-xs text-slate-400">標準出力(STDOUT)・標準エラー(STDERR)・システムメッセージをタイムスタンプ順にリアルタイム表示します。</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ログ検索..."
              className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-40"
            />
          </div>

          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">全ログレベル</option>
            <option value="STDOUT">STDOUT (標準出力)</option>
            <option value="STDERR">STDERR (標準エラー)</option>
            <option value="INFO">INFO (情報)</option>
            <option value="ERROR">ERROR (エラー)</option>
            <option value="SKIP">SKIP (スキップ)</option>
          </select>

          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            title="最新化"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onClearLogs}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 text-xs font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>ログクリア</span>
          </button>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 font-mono text-xs max-h-[600px] overflow-y-auto space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            表示対象のログはありません。
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="text-indigo-400 font-bold">{log.programName}</span>
                <span>{new Date(log.timestamp).toLocaleString('ja-JP')}</span>
              </div>
              <div className="flex items-start space-x-2.5 pt-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                  log.level === 'ERROR' || log.level === 'STDERR' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                  log.level === 'SKIP' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  log.level === 'STDOUT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {log.level}
                </span>
                <p className="text-slate-200 break-all leading-relaxed">{log.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
