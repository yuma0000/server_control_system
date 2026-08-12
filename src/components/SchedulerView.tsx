import React from 'react';
import { Clock, Code2, CheckCircle2, Play } from 'lucide-react';
import { Program } from '../types';

interface SchedulerViewProps {
  programs: Program[];
  onOpenEditModal: (program: Program) => void;
  onRunProgram: (id: string) => void;
}

export const SchedulerView: React.FC<SchedulerViewProps> = ({
  programs,
  onOpenEditModal,
  onRunProgram
}) => {
  const scheduledPrograms = programs.filter(p => p.schedule?.enabled);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
          <Clock className="w-5 h-5 text-purple-400" />
          <span>時間指定スケジュール管理 ({scheduledPrograms.length}件 予約中)</span>
        </h3>
        <p className="text-xs text-slate-400">毎日定刻（HH:MM）にプログラムを全自動実行します。重複実行防止機能が有効です。</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 divide-y divide-slate-800">
        {scheduledPrograms.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            現在、時間指定スケジュールが有効なプログラムはありません。プログラム管理画面から設定してください。
          </div>
        ) : (
          scheduledPrograms.map((prog) => (
            <div key={prog.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-slate-100 text-base">{prog.name}</span>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    毎日 {prog.schedule.timeStr} 実行
                  </span>
                </div>
                <p className="text-xs text-slate-400">{prog.description || 'メモなし'}</p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onRunProgram(prog.id)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center space-x-1"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>今すぐ手動テスト</span>
                </button>
                <button
                  onClick={() => onOpenEditModal(prog)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium"
                >
                  時刻を変更
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
