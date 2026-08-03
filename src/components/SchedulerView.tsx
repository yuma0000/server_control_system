import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Code2, 
  ShieldCheck, 
  Info,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
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

  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 text-xs font-semibold border border-purple-500/20">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
            自動タイマー予約マネージャー
          </div>
          <h3 className="text-xl font-bold text-slate-100">
            時間指定（HH:MM）スケジュール管理
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl">
            指定時刻（時:分）にプログラムを自動起動します。Railway上で安定してタスクを定時実行します。
          </p>
        </div>

        {/* Live Clock Card */}
        <div className="bg-slate-950 px-5 py-3 rounded-xl border border-purple-500/30 text-center shrink-0">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">現在の時刻 (JST)</span>
          <span className="text-2xl font-bold font-mono text-purple-300 tracking-wider">
            {currentTime || '00:00:00'}
          </span>
        </div>
      </div>

      {/* Critical System Rule Card */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/30 rounded-2xl p-5 space-y-3">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-purple-400" />
          <h4 className="font-bold text-slate-100 text-sm">
            【安全制御ルール】重複起動防止システム
          </h4>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          指定された時刻（例: <span className="font-mono text-purple-300">14:30</span>）に到達した際、対象プログラムが<span className="text-emerald-400 font-bold">すでに起動中(RUNNING)</span>である場合、安全のためシステムは新プロセスの生成を行わず<span className="text-amber-400 font-bold">「実行スキップ（何もしない）」</span>を適用します。これにより、二重実行や重度な負荷を防ぎます。
        </p>
      </div>

      {/* Scheduled Tasks List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-100 text-sm flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span>予約済みタスク一覧 ({scheduledPrograms.length}件)</span>
          </h4>
        </div>

        {scheduledPrograms.length === 0 ? (
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-purple-400">
              <Clock className="w-6 h-6" />
            </div>
            <h5 className="font-bold text-slate-200 text-sm">予約されている時間指定タスクはありません</h5>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              プログラム管理画面にてコードを編集し、「時間指定スケジュール」を有効にするとここに表示されます。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {scheduledPrograms.map((program) => (
              <div
                key={program.id}
                className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 space-y-4 flex flex-col justify-between shadow-lg"
              >
                <div className="space-y-3">
                  {/* Time Badge & Language */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xl font-bold px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center">
                      <Clock className="w-4 h-4 mr-1.5" />
                      {program.schedule.timeStr}
                    </span>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                      {program.language}
                    </span>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-100 text-base">{program.name}</h5>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{program.description || '説明なし'}</p>
                  </div>

                  {/* Status Indicator */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">現在のステータス</span>
                      <span className={`font-semibold ${
                        program.status === 'RUNNING' ? 'text-emerald-400' :
                        program.status === 'SUCCESS' ? 'text-slate-200' :
                        program.status === 'FAILED' ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {program.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">重複発生時の動作</span>
                      <span className="text-purple-300 font-medium">スキップ (何もしない)</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onRunProgram(program.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center space-x-1 transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>今すぐテスト実行</span>
                  </button>

                  <button
                    onClick={() => onOpenEditModal(program)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
                  >
                    時刻設定変更
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
