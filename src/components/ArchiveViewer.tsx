import React, { useState } from 'react';
import { ARCHIVED_FILES_V1, ArchivedFile } from '../archiveCodeData';
import { Folder, FileCode, Copy, Check, Info, Shield, Code2 } from 'lucide-react';

export const ArchiveViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<ArchivedFile>(ARCHIVED_FILES_V1[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Explanation Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Shield className="w-3.5 h-3.5" />
            <span>旧バージョン コード保管ライブラリ</span>
          </div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <span>閲覧用アーカイブ (v1 旧実装ファイル参照)</span>
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
            以前のコードはすべてこのアーカイブフォルダー内に完全保存され閲覧・コピーが可能です。ベースコードとの比較や過去の処理ロジックの再利用にご活用いただけます。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* File List Sidebar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
            <Folder className="w-4 h-4 text-indigo-400" />
            <span>保存ファイル一覧</span>
          </h4>

          <div className="space-y-1">
            {ARCHIVED_FILES_V1.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <FileCode className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-indigo-400'}`} />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ml-2 ${
                    isSelected ? 'bg-indigo-500/40 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {file.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Code View Area */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Code2 className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-slate-100 text-sm">{selectedFile.path}</span>
                </div>
                <p className="text-xs text-slate-400">{selectedFile.description}</p>
              </div>

              <button
                onClick={handleCopy}
                className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">コピー完了</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>コードをコピー</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Block */}
            <div className="mt-4 relative bg-slate-950 rounded-xl p-4 border border-slate-800/80 font-mono text-xs text-slate-300 overflow-x-auto max-h-[500px] overflow-y-auto leading-relaxed">
              <pre>{selectedFile.code}</pre>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center space-x-1">
              <Info className="w-3.5 h-3.5 text-indigo-400 mr-1" />
              <span>閲覧専用アーカイブフォルダー: `/src/archive_v1/`</span>
            </span>
            <span className="font-mono text-slate-500">ReadOnly</span>
          </div>
        </div>
      </div>
    </div>
  );
};
