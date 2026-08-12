import React, { useState, useEffect } from 'react';
import { Sliders, Plus, Trash2, Save, Eye, EyeOff, Check } from 'lucide-react';
import { ServerEnvVar } from '../types';

interface EnvVarsViewProps {
  envVars: ServerEnvVar[];
  onSaveEnvVars: (vars: ServerEnvVar[]) => void;
}

export const EnvVarsView: React.FC<EnvVarsViewProps> = ({
  envVars,
  onSaveEnvVars
}) => {
  const [localVars, setLocalVars] = useState<ServerEnvVar[]>(envVars);
  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    setLocalVars(envVars);
  }, [envVars]);

  const handleAdd = () => {
    setLocalVars([...localVars, { key: '', value: '', isSecret: false }]);
  };

  const handleRemove = (index: number) => {
    setLocalVars(localVars.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof ServerEnvVar, value: any) => {
    const updated = [...localVars];
    updated[index] = { ...updated[index], [field]: value };
    setLocalVars(updated);
  };

  const handleSave = () => {
    const valid = localVars.filter(v => v.key.trim().length > 0);
    onSaveEnvVars(valid);
    setSavedMsg('環境変数を保存しました。');
    setTimeout(() => setSavedMsg(null), 3000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <span>サーバー環境変数設定 ({localVars.length}件)</span>
          </h3>
          <p className="text-xs text-slate-400">Node.js サーバープロセスおよび子プログラムへ引き渡す環境変数を設定します。</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleAdd}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>変数追加</span>
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>設定を保存</span>
          </button>
        </div>
      </div>

      {savedMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
          <Check className="w-4 h-4" />
          <span>{savedMsg}</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        {localVars.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            環境変数は登録されていません。「変数追加」ボタンを押して登録してください。
          </div>
        ) : (
          localVars.map((item, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
              <input
                type="text"
                value={item.key}
                onChange={(e) => handleChange(idx, 'key', e.target.value)}
                placeholder="KEY (例: API_KEY)"
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 flex-1"
              />
              <div className="relative flex-1">
                <input
                  type={item.isSecret && !showSecrets[idx] ? 'password' : 'text'}
                  value={item.value}
                  onChange={(e) => handleChange(idx, 'value', e.target.value)}
                  placeholder="VALUE"
                  className="w-full px-3 py-1.5 pr-9 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
                {item.isSecret && (
                  <button
                    type="button"
                    onClick={() => setShowSecrets({ ...showSecrets, [idx]: !showSecrets[idx] })}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
                  >
                    {showSecrets[idx] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <label className="flex items-center space-x-1.5 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!item.isSecret}
                    onChange={(e) => handleChange(idx, 'isSecret', e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-indigo-600"
                  />
                  <span>秘匿値 (Secret)</span>
                </label>

                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
