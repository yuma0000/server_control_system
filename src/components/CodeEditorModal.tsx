import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  Code2, 
  Clock, 
  Sliders, 
  AlertCircle,
  Copy,
  Check,
  Plus,
  Trash2,
  Upload,
  FileCode,
  ChevronDown,
  ChevronRight,
  Star,
  FileText
} from 'lucide-react';
import { Program, ProgramLanguage, CodeFile } from '../types';

interface CodeEditorModalProps {
  program?: Program | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (program: Program) => void;
  onRunTest: (id: string) => void;
  onStopTest: (id: string) => void;
}

function getDefaultFilename(lang: ProgramLanguage): string {
  switch (lang) {
    case 'python': return 'main.py';
    case 'bash': return 'script.sh';
    case 'php': return 'index.php';
    case 'ruby': return 'app.rb';
    default: return 'index.js';
  }
}

export const CodeEditorModal: React.FC<CodeEditorModalProps> = ({
  program,
  isOpen,
  onClose,
  onSave
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(program?.name || '');
  const [description, setDescription] = useState(program?.description || '');
  const [language, setLanguage] = useState<ProgramLanguage>(program?.language || 'nodejs');
  const [timeoutSec, setTimeoutSec] = useState(program?.timeoutSec || 30);
  
  // Multi-file state
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>('');
  
  // Environment variables
  const [envPairs, setEnvPairs] = useState<{ key: string; value: string }[]>(
    program?.envVars ? Object.entries(program.envVars).map(([key, value]) => ({ key, value })) : []
  );

  // Schedule state
  const [scheduleEnabled, setScheduleEnabled] = useState(program?.schedule?.enabled || false);
  const [timeStr, setTimeStr] = useState(program?.schedule?.timeStr || '12:00');

  // UI States
  const [copied, setCopied] = useState(false);
  const [isCodeCollapsed, setIsCodeCollapsed] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (program) {
      setName(program.name);
      setDescription(program.description);
      setLanguage(program.language);
      setTimeoutSec(program.timeoutSec || 30);
      setEnvPairs(program.envVars ? Object.entries(program.envVars).map(([key, value]) => ({ key, value })) : []);
      setScheduleEnabled(program.schedule?.enabled || false);
      setTimeStr(program.schedule?.timeStr || '12:00');

      if (program.files && program.files.length > 0) {
        setFiles(program.files);
        const entry = program.files.find(f => f.isEntry) || program.files[0];
        setActiveFileId(entry.id);
      } else {
        const initFile: CodeFile = {
          id: `file-${Date.now()}-1`,
          filename: getDefaultFilename(program.language),
          content: program.code || '',
          isEntry: true
        };
        setFiles([initFile]);
        setActiveFileId(initFile.id);
      }
    } else {
      setName('新規プログラム');
      setDescription('');
      setLanguage('nodejs');
      setTimeoutSec(30);
      setEnvPairs([]);
      setScheduleEnabled(false);
      setTimeStr('09:00');

      const initFile: CodeFile = {
        id: `file-${Date.now()}-1`,
        filename: 'index.js',
        content: '// ここにプログラムを記述してください\nconsole.log("Hello from Railway Process!");\n',
        isEntry: true
      };
      setFiles([initFile]);
      setActiveFileId(initFile.id);
    }
  }, [program]);

  // Active File Reference
  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  const handleUpdateActiveFile = (fields: Partial<CodeFile>) => {
    if (!activeFile) return;
    setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, ...fields } : f));
  };

  const handleAddNewFile = () => {
    const ext = getDefaultFilename(language).split('.').pop() || 'js';
    const newFile: CodeFile = {
      id: `file-${Date.now()}-${files.length + 1}`,
      filename: `file_${files.length + 1}.${ext}`,
      content: '',
      isEntry: files.length === 0
    };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
  };

  const handleRemoveFile = (idToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (files.length <= 1) {
      setValidationError('プロセスには最低1つのファイルが必要です。');
      return;
    }

    setValidationError(null);
    const updated = files.filter(f => f.id !== idToRemove);
    // If we removed the entry file, set the first one as entry
    if (!updated.some(f => f.isEntry) && updated.length > 0) {
      updated[0].isEntry = true;
    }
    setFiles(updated);
    if (activeFileId === idToRemove) {
      setActiveFileId(updated[0].id);
    }
  };

  const handleSetEntryFile = (id: string) => {
    setFiles(prev => prev.map(f => ({
      ...f,
      isEntry: f.id === id
    })));
  };

  // Read Local Files Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    Array.from(uploadedFiles).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const textContent = event.target?.result as string || '';
        const newFile: CodeFile = {
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          filename: file.name,
          content: textContent,
          isEntry: files.length === 0
        };
        setFiles(prev => [...prev, newFile]);
        setActiveFileId(newFile.id);
      };
      reader.readAsText(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddEnvPair = () => {
    setEnvPairs([...envPairs, { key: '', value: '' }]);
  };

  const handleRemoveEnvPair = (index: number) => {
    setEnvPairs(envPairs.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) {
      setValidationError('プログラム名を入力してください');
      return;
    }

    if (files.length === 0) {
      setValidationError('プログラムファイルが作成されていません。');
      return;
    }

    setValidationError(null);

    const envVarsRecord: Record<string, string> = {};
    envPairs.forEach(pair => {
      if (pair.key.trim()) {
        envVarsRecord[pair.key.trim()] = pair.value;
      }
    });

    const entryFile = files.find(f => f.isEntry) || files[0];

    const updatedProgram: Program = {
      id: program?.id || `prog-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      language,
      files,
      code: entryFile ? entryFile.content : '',
      timeoutSec: Number(timeoutSec) || 30,
      envVars: envVarsRecord,
      schedule: {
        enabled: scheduleEnabled,
        timeStr: timeStr || '12:00',
        daysOfWeek: [],
        skipIfRunning: true
      },
      status: program?.status || 'IDLE',
      createdAt: program?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(updatedProgram);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100">
                {program ? 'プロセス構成 & マルチファイル設定' : '新規プロセス構成の作成'}
              </h3>
              <p className="text-[11px] text-slate-400">
                プロセス専用ディレクトリ内で動かすコード・外部ファイルを管理します
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
              <span>{validationError}</span>
              <button 
                onClick={() => setValidationError(null)}
                className="text-rose-400 hover:text-rose-200 font-bold ml-2"
              >
                ×
              </button>
            </div>
          )}
          
          {/* Metadata Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="font-semibold text-slate-300">プロセス / プログラム名 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: データ集計・API同期プロセス"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 font-mono">実行環境 (ランタイム)</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as ProgramLanguage)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="nodejs">Node.js (JavaScript)</option>
                <option value="python">Python 3</option>
                <option value="bash">Shell Script (Bash)</option>
                <option value="php">PHP</option>
                <option value="ruby">Ruby</option>
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="font-semibold text-slate-300">プロセスの説明</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例: 指定ファイルを読み込みログ出力を行うプロセス"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">タイムアウト (秒)</label>
              <input
                type="number"
                min="5"
                max="300"
                value={timeoutSec}
                onChange={(e) => setTimeoutSec(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Schedule Configuration Banner */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-slate-200">時間指定スケジュール (HH:MM)</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                <span className="ml-2 text-xs text-slate-300">{scheduleEnabled ? '有効' : '無効'}</span>
              </label>
            </div>

            {scheduleEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                <div className="space-y-1">
                  <label className="text-slate-400">指定時刻 (24時間表記 HH:MM)</label>
                  <input
                    type="time"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-purple-300 font-mono font-bold focus:outline-none"
                  />
                </div>
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-200 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <strong className="text-white">重複スキップ:</strong> 該当時刻にプロセスが既に実行中の場合は新プロセスを起動しません。
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Multi-file Management Section */}
          <div className="space-y-3 bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <h4 className="font-bold text-slate-200 flex items-center space-x-2">
                  <FileCode className="w-4 h-4 text-indigo-400" />
                  <span>プロセス内構成ファイル群 (マルチコード & データ)</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 text-[10px]">
                    {files.length} ファイル
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  すべてのファイルはプロセス分離ディレクトリ内 (<code className="text-indigo-300 font-mono">/data/processes/&lt;id&gt;/</code>) に配置されます。
                </p>
              </div>

              {/* Actions: Add file / Read local file */}
              <div className="flex items-center space-x-2 shrink-0">
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs flex items-center space-x-1.5 transition-all"
                  title="ローカルPCのテキスト・コード・設定ファイルを読込"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-400" />
                  <span>ファイル読み込み</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddNewFile}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-indigo-600/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新規ファイル追加</span>
                </button>
              </div>
            </div>

            {/* Files Tabs */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-thin">
              {files.map((file) => {
                const isActive = file.id === activeFileId;
                return (
                  <div
                    key={file.id}
                    onClick={() => setActiveFileId(file.id)}
                    className={`group flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-mono cursor-pointer transition-all shrink-0 ${
                      isActive 
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200 font-semibold shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {file.isEntry ? (
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" title="メイン実行ファイル (Entry Point)" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    
                    <span className="truncate max-w-[140px]">{file.filename || '名称未設定'}</span>

                    <button
                      type="button"
                      onClick={(e) => handleRemoveFile(file.id, e)}
                      className="p-0.5 text-slate-500 hover:text-rose-400 opacity-60 group-hover:opacity-100 transition-opacity"
                      title="ファイルを削除"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Active File Editor Header (Filename edit & Entry toggle) */}
            {activeFile && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center space-x-2 flex-1">
                    <label className="text-slate-400 font-medium shrink-0">ファイル名変更:</label>
                    <input
                      type="text"
                      value={activeFile.filename}
                      onChange={(e) => handleUpdateActiveFile({ filename: e.target.value })}
                      placeholder="例: config.json または utils.py"
                      className="bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1 text-xs text-indigo-300 font-mono font-bold w-full max-w-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSetEntryFile(activeFile.id)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center space-x-1.5 transition-all ${
                        activeFile.isEntry
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                      }`}
                      title="このファイルをプロセスのメイン実行エントリに指定"
                    >
                      <Star className={`w-3.5 h-3.5 ${activeFile.isEntry ? 'fill-amber-400 text-amber-400' : ''}`} />
                      <span>{activeFile.isEntry ? 'メイン実行ファイル (Entry)' : 'メイン実行に指定'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCodeCollapsed(!isCodeCollapsed)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] flex items-center space-x-1 transition-all"
                    >
                      {isCodeCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      <span>{isCodeCollapsed ? 'コードを展開' : 'コードを折りたたむ'}</span>
                    </button>
                  </div>
                </div>

                {/* Collapsible Editor Container */}
                {!isCodeCollapsed ? (
                  <div className="relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs">
                    <div className="px-3 py-1.5 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span>ソースコード・ファイルデータ記述 ({activeFile.filename})</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(activeFile.content);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="hover:text-slate-200 flex items-center space-x-1"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'コピー完了' : 'コピー'}</span>
                      </button>
                    </div>

                    <textarea
                      value={activeFile.content}
                      onChange={(e) => handleUpdateActiveFile({ content: e.target.value })}
                      rows={11}
                      className="w-full bg-transparent p-3.5 text-slate-200 focus:outline-none resize-y font-mono leading-relaxed selection:bg-indigo-600/40"
                      placeholder={`// ${activeFile.filename} のコード内容を入力...`}
                      spellCheck={false}
                    />
                  </div>
                ) : (
                  <div 
                    onClick={() => setIsCodeCollapsed(false)}
                    className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-slate-400 font-mono text-xs cursor-pointer hover:bg-slate-900/80 transition-colors flex items-center justify-between"
                  >
                    <span className="truncate">折りたたまれました: {activeFile.filename} ({activeFile.content.split('\n').length} 行)</span>
                    <span className="text-indigo-400 text-[11px] underline">クリックで展開</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Environment Variables for Program */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300 flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>プロセス専用環境変数 (Optional)</span>
              </label>
              <button
                type="button"
                onClick={handleAddEnvPair}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                + 変数を追加
              </button>
            </div>

            {envPairs.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">追加された環境変数はありません。</p>
            ) : (
              <div className="space-y-2">
                {envPairs.map((pair, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="KEY (例: API_KEY)"
                      value={pair.key}
                      onChange={(e) => {
                        const updated = [...envPairs];
                        updated[idx].key = e.target.value;
                        setEnvPairs(updated);
                      }}
                      className="w-1/3 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="VALUE (例: secret_123)"
                      value={pair.value}
                      onChange={(e) => {
                        const updated = [...envPairs];
                        updated[idx].value = e.target.value;
                        setEnvPairs(updated);
                      }}
                      className="w-2/3 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveEnvPair(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 hidden sm:block">
            * 保存時に全ファイルがプロセス専用ディレクトリ内に生成・同期されます
          </div>

          <div className="flex items-center space-x-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>保存してプロセス配置</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
