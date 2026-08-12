import React, { useState } from 'react';
import { Play, Square, Code2, Plus, Search, Trash2, Edit3, Clock, CheckCircle2, AlertCircle, Sliders } from 'lucide-react';
import { Program } from '../types';

interface ProgramManagerViewProps {
  programs: Program[];
  onRunProgram: (id: string) => void;
  onStopProgram: (id: string) => void;
  onDeleteProgram: (id: string) => void;
  onOpenEditModal: (program: Program | null) => void;
}

export const ProgramManagerView: React.FC<ProgramManagerViewProps> = ({
  programs,
  onRunProgram,
  onStopProgram,
  onDeleteProgram,
  onOpenEditModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPrograms = programs.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <Code2 className="w-5 h-5 text-indigo-400" />
            <span>プログラム管理 ({programs.length}件)</span>
          </h3>
          <p className="text-xs text-slate-400">登録済みプログラムの追加・編集・手動起動・停止を行います。</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="検索..."
              className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-44"
            />
          </div>

          <button
            onClick={() => onOpenEditModal(null)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>新規プログラム</span>
          </button>
        </div>
      </div>

      {/* Program Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPrograms.length === 0 ? (
          <div className="col-span-full p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
            該当するプログラムが見つかりませんでした。
          </div>
        ) : (
          filteredPrograms.map((prog) => (
            <div key={prog.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-100 text-base">{prog.name}</h4>
                    <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                      {prog.language}
                    </span>
                  </div>

                  <div>
                    {prog.status === 'RUNNING' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                        実行中
                      </span>
                    )}
                    {prog.status === 'SUCCESS' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" /> 成功
                      </span>
                    )}
                    {prog.status === 'FAILED' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <AlertCircle className="w-3 h-3 mr-1" /> エラー
                      </span>
                    )}
                    {(prog.status === 'IDLE' || prog.status === 'STOPPED') && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-400">
                        待機中
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2">{prog.description || 'メモなし'}</p>

                <div className="space-y-1">
                  {prog.schedule?.enabled && (
                    <div className="flex items-center text-xs text-purple-300 font-mono">
                      <Clock className="w-3.5 h-3.5 mr-1 text-purple-400 shrink-0" />
                      <span>毎日 {prog.schedule.timeStr} 自動起動</span>
                    </div>
                  )}

                  {prog.envVars && Object.keys(prog.envVars).length > 0 && (
                    <div className="flex items-center text-xs text-emerald-300 font-mono">
                      <Sliders className="w-3.5 h-3.5 mr-1 text-emerald-400 shrink-0" />
                      <span>専用環境変数: {Object.keys(prog.envVars).length} 件設定</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {prog.status === 'RUNNING' ? (
                    <button
                      onClick={() => onStopProgram(prog.id)}
                      className="px-3 py-1.5 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center space-x-1.5"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>停止</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onRunProgram(prog.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center space-x-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>実行</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onOpenEditModal(prog)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    title="編集"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteProgram(prog.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
