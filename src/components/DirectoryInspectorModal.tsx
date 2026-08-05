import React, { useState, useEffect } from 'react';
import { Folder, FileText, RefreshCw, X, HardDrive, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Program, ProcessFileEntry } from '../types';

interface DirectoryInspectorModalProps {
  program: Program;
  onClose: () => void;
}

export const DirectoryInspectorModal: React.FC<DirectoryInspectorModalProps> = ({ program, onClose }) => {
  const [files, setFiles] = useState<ProcessFileEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFile, setSelectedFile] = useState<ProcessFileEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDirectory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/programs/${program.id}/directory`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        if (data.files && data.files.length > 0) {
          setSelectedFile(data.files[0]);
        }
      } else {
        setError('プロセスディレクトリの取得に失敗しました。');
      }
    } catch (err: any) {
      setError(err.message || 'ディレクトリ情報のロード中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, [program.id]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-100 text-base">{program.name}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  /data/processes/{program.id}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">プロセス独立実行ディレクトリ構造 & リアルタイムファイル監視</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchDirectory}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              title="最新のファイル構造に更新"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">再読込</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3">
          {/* File Tree List */}
          <div className="border-r border-slate-800 p-4 overflow-y-auto space-y-2 bg-slate-900/60">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1 pb-1 border-b border-slate-800/80">
              <span>ディレクトリ内ファイル ({files.length})</span>
              <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            </div>

            {loading ? (
              <div className="py-12 text-center space-y-2 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
                <p className="text-xs">プロセスディレクトリ走査中...</p>
              </div>
            ) : error ? (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : files.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                ディレクトリ内にファイルが見つかりません
              </div>
            ) : (
              files.map((file) => {
                const isSelected = selectedFile?.relativePath === file.relativePath;
                const isEntryFile = program.files.some(f => f.filename === file.relativePath && f.isEntry);

                return (
                  <button
                    key={file.relativePath}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all text-left ${
                      isSelected
                        ? 'bg-indigo-600/20 border border-indigo-500/40 text-slate-100 font-medium'
                        : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0 pr-2">
                      <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
                      <span className="truncate font-mono text-[11px]">{file.relativePath}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {isEntryFile && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          ENTRY
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatSize(file.sizeBytes)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* File Viewer Content */}
          <div className="md:col-span-2 p-4 flex flex-col h-full bg-slate-950/40 overflow-hidden">
            {selectedFile ? (
              <div className="flex flex-col h-full space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span className="font-mono text-xs font-bold text-slate-200">{selectedFile.relativePath}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1 text-slate-500" />
                      {new Date(selectedFile.updatedAt).toLocaleTimeString('ja-JP')}
                    </span>
                    <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      {formatSize(selectedFile.sizeBytes)}
                    </span>
                  </div>
                </div>

                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 overflow-auto font-mono text-xs text-slate-300 whitespace-pre leading-relaxed">
                  {selectedFile.content || '(ファイルの内容は空、またはバイナリ形式です)'}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
                <Folder className="w-8 h-8 opacity-40" />
                <p>左パネルからファイルを選択して内容を確認できます</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>プロセス隔離フォルダ: 各実行時に同一構成が最新出力データと共に分離保護されます</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
