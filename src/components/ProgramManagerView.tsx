import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  Plus, 
  Search, 
  Code2, 
  Clock, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  Folder,
  FileCode,
  ChevronDown,
  ChevronRight,
  Star
} from 'lucide-react';
import { Program } from '../types';

interface ProgramManagerViewProps {
  programs: Program[];
  onRunProgram: (id: string) => void;
  onStopProgram: (id: string) => void;
  onDeleteProgram: (id: string) => void;
  onOpenEditModal: (program?: Program) => void;
}

export const ProgramManagerView: React.FC<ProgramManagerViewProps> = ({
  programs,
  onRunProgram,
  onStopProgram,
  onDeleteProgram,
  onOpenEditModal
}) => {
  const [search, setSearch] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ALL');
  
  // Track collapsed status for individual program cards
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});

  // Custom modal for deleting program without relying on window.confirm
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null);

  const toggleCardCollapse = (id: string) => {
    setCollapsedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = programs.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                        p.description.toLowerCase().includes(search.toLowerCase());
    const matchLang = selectedLanguage === 'ALL' || p.language === selectedLanguage;
    return matchSearch && matchLang;
  });

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Code2 className="w-5 h-5 text-indigo-400" />
            <span>登録プロセス一覧 & サンドボックス</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            プロセス分離ディレクトリ内で複数ファイル・設定・コードを独立管理・非同期実行します。
          </p>
        </div>

        <button
          onClick={() => onOpenEditModal()}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>新規プロセスを作成</span>
        </button>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="プロセス名や説明で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto text-xs">
          {['ALL', 'nodejs', 'python', 'bash', 'php', 'ruby'].map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all uppercase ${
                selectedLanguage === lang
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {lang === 'ALL' ? 'すべて' : lang}
            </button>
          ))}
        </div>
      </div>

      {/* Program Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-8 sm:p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Code2 className="w-6 h-6" />
          </div>
          <h4 className="text-slate-200 font-bold text-sm">該当するプロセスがありません</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            サンプルデータは含まれていません。「新規プロセスを作成」ボタンからプログラムファイルを作成またはアップロードしてください。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((program) => {
            const isCodeCollapsed = collapsedCards[program.id] ?? false;
            const fileCount = program.files ? program.files.length : (program.code ? 1 : 0);
            const entryFile = program.files?.find(f => f.isEntry) || program.files?.[0];
            const mainCode = entryFile ? entryFile.content : (program.code || '');

            return (
              <div
                key={program.id}
                className="bg-slate-900/90 rounded-2xl border border-slate-800/90 hover:border-slate-700 p-5 space-y-4 flex flex-col justify-between transition-all shadow-md hover:shadow-xl group"
              >
                <div className="space-y-3">
                  {/* Header: Name, Language Badge & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                          {program.language}
                        </span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center">
                          <Folder className="w-2.5 h-2.5 mr-1 text-indigo-400" />
                          {fileCount}ファイル
                        </span>
                        {program.schedule?.enabled && (
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center">
                            <Clock className="w-2.5 h-2.5 mr-1" />
                            {program.schedule.timeStr}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-100 text-base group-hover:text-indigo-300 transition-colors">
                        {program.name}
                      </h4>
                    </div>

                    {/* Status Indicator */}
                    <div>
                      {program.status === 'RUNNING' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                          実行中
                        </span>
                      )}
                      {program.status === 'SUCCESS' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                          成功
                        </span>
                      )}
                      {program.status === 'FAILED' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3 h-3 mr-1" />
                          エラー
                        </span>
                      )}
                      {program.status === 'IDLE' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
                          待機中
                        </span>
                      )}
                      {program.status === 'STOPPED' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          停止
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {program.description || '説明なし'}
                  </p>

                  {/* Files List Preview */}
                  {program.files && program.files.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {program.files.map(f => (
                        <span 
                          key={f.id} 
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center space-x-1 ${
                            f.isEntry 
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 font-semibold' 
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          {f.isEntry && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 mr-0.5" />}
                          <span className="truncate max-w-[100px]">{f.filename}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Collapsible Code preview snippet */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center space-x-1 font-mono">
                        <FileCode className="w-3 h-3 text-indigo-400" />
                        <span>Entry: {entryFile?.filename || 'code'}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleCardCollapse(program.id)}
                        className="hover:text-slate-200 flex items-center space-x-0.5 text-[10px]"
                      >
                        {isCodeCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span>{isCodeCollapsed ? '展開' : '折りたたむ'}</span>
                      </button>
                    </div>

                    {!isCodeCollapsed ? (
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-hidden max-h-24 select-none">
                        <pre className="line-clamp-3 text-slate-400">
                          {mainCode.trim() || '// (コード記述なし)'}
                        </pre>
                      </div>
                    ) : (
                      <div 
                        onClick={() => toggleCardCollapse(program.id)}
                        className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-500 cursor-pointer hover:bg-slate-900 transition-colors"
                      >
                        コード折りたたみ中 ({mainCode.split('\n').length} 行)
                      </div>
                    )}
                  </div>

                  {/* Execution Stats */}
                  <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80">
                    <span>タイムアウト: {program.timeoutSec || 30}秒</span>
                    {program.lastRunDurationMs ? (
                      <span>直前実行時間: {(program.lastRunDurationMs / 1000).toFixed(2)}s</span>
                    ) : (
                      <span>未実行</span>
                    )}
                  </div>
                </div>

                {/* Action Bar */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {program.status === 'RUNNING' ? (
                      <button
                        onClick={() => onStopProgram(program.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-all"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>停止</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onRunProgram(program.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>実行</span>
                      </button>
                    )}

                    <button
                      onClick={() => onOpenEditModal(program)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center space-x-1.5 transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>構成編集</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setProgramToDelete(program)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {programToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-base">プロセスの削除確認</h4>
                <p className="text-xs text-slate-400">この操作は元に戻せません</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              プログラム <span className="font-bold text-slate-100">「{programToDelete.name}」</span> を削除してもよろしいですか？<br />
              プロセス分離ディレクトリおよび構成コードファイルが完全に削除されます。
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setProgramToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  onDeleteProgram(programToDelete.id);
                  setProgramToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all active:scale-95"
              >
                削除を実行
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
