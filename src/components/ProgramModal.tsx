import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Code2, Clock, FileCode } from 'lucide-react';
import { Program, ProgramLanguage, CodeFile } from '../types';

interface ProgramModalProps {
  program: Program | null;
  onClose: () => void;
  onSave: (prog: Partial<Program>) => void;
}

export const ProgramModal: React.FC<ProgramModalProps> = ({
  program,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<ProgramLanguage>('nodejs');
  const [files, setFiles] = useState<CodeFile[]>([
    { id: 'f-1', filename: 'index.js', content: 'console.log("Hello Node.js Server!");\n', isEntry: true }
  ]);
  const [activeFileId, setActiveFileId] = useState('f-1');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('12:00');

  useEffect(() => {
    if (program) {
      setName(program.name);
      setDescription(program.description || '');
      setLanguage(program.language);
      setFiles(program.files && program.files.length > 0 ? program.files : [
        { id: 'f-1', filename: 'index.js', content: '// script\n', isEntry: true }
      ]);
      if (program.files && program.files[0]) setActiveFileId(program.files[0].id);
      setScheduleEnabled(program.schedule?.enabled || false);
      setScheduleTime(program.schedule?.timeStr || '12:00');
    }
  }, [program]);

  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  const handleAddFile = () => {
    const ext = language === 'python' ? '.py' : language === 'bash' ? '.sh' : '.js';
    const newFile: CodeFile = {
      id: `f-${Date.now()}`,
      filename: `file_${files.length + 1}${ext}`,
      content: '// new file content\n',
      isEntry: files.length === 0
    };
    setFiles([...files, newFile]);
    setActiveFileId(newFile.id);
  };

  const handleDeleteFile = (id: string) => {
    if (files.length <= 1) return;
    const filtered = files.filter(f => f.id !== id);
    if (filtered.length > 0 && !filtered.some(f => f.isEntry)) {
      filtered[0].isEntry = true;
    }
    setFiles(filtered);
    if (activeFileId === id) setActiveFileId(filtered[0].id);
  };

  const handleUpdateActiveFile = (key: 'filename' | 'content' | 'isEntry', value: any) => {
    setFiles(files.map(f => {
      if (f.id === activeFileId) {
        if (key === 'isEntry' && value === true) {
          return { ...f, isEntry: true };
        }
        return { ...f, [key]: value };
      }
      if (key === 'isEntry' && value === true) {
        return { ...f, isEntry: false };
      }
      return f;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: program?.id,
      name,
      description,
      language,
      files,
      schedule: {
        enabled: scheduleEnabled,
        timeStr: scheduleTime,
        skipIfRunning: true
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <Code2 className="w-5 h-5 text-indigo-400" />
            <span>{program ? 'プログラム設定変更' : '新規プログラム作成'}</span>
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">プログラム名 *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: データ収集バッチ"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">実行言語</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as ProgramLanguage)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="nodejs">Node.js (JavaScript / ES6)</option>
                <option value="python">Python 3</option>
                <option value="bash">Bash Script</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">概要・メモ</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例: 毎日定期実行する処理"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Schedule Config */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>定刻自動起動 (スケジュール設定)</span>
              </span>
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-700"
              />
            </div>

            {scheduleEnabled && (
              <div className="flex items-center space-x-3 pt-2">
                <span className="text-xs text-slate-400">毎日定刻:</span>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 font-mono"
                />
                <span className="text-[11px] text-slate-400">※実行中であれば二重起動を自動回避します</span>
              </div>
            )}
          </div>

          {/* File Editor Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span>構成ファイル一覧</span>
              </span>
              <button
                type="button"
                onClick={handleAddFile}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ファイル追加</span>
              </button>
            </div>

            {/* File Tabs */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              {files.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFileId(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center space-x-2 shrink-0 border ${
                    activeFileId === f.id
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span>{f.filename}</span>
                  {f.isEntry && <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1 rounded font-bold">ENTRY</span>}
                </button>
              ))}
            </div>

            {/* Active File Editor */}
            {activeFile && (
              <div className="space-y-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <input
                    type="text"
                    value={activeFile.filename}
                    onChange={(e) => handleUpdateActiveFile('filename', e.target.value)}
                    className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono"
                  />
                  <div className="flex items-center space-x-3 text-xs">
                    <label className="flex items-center space-x-1.5 text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!activeFile.isEntry}
                        onChange={(e) => handleUpdateActiveFile('isEntry', e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-indigo-600"
                      />
                      <span>エントリーファイル</span>
                    </label>
                    {files.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteFile(activeFile.id)}
                        className="p-1 rounded text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  rows={8}
                  value={activeFile.content}
                  onChange={(e) => handleUpdateActiveFile('content', e.target.value)}
                  className="w-full p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 leading-relaxed"
                  placeholder="// スクリプトコードを入力"
                />
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
            >
              保存する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
