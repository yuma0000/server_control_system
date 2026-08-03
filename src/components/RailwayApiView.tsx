import React, { useState } from 'react';
import { 
  Sliders, 
  Key, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  Save, 
  Check, 
  Server, 
  Activity, 
  Layers, 
  ExternalLink,
  ShieldAlert,
  Terminal,
  RefreshCw
} from 'lucide-react';
import { RailwayEnvVar } from '../types';

interface RailwayApiViewProps {
  envVars: RailwayEnvVar[];
  onSaveEnvVars: (vars: RailwayEnvVar[]) => void;
}

export const RailwayApiView: React.FC<RailwayApiViewProps> = ({
  envVars,
  onSaveEnvVars
}) => {
  const [varsList, setVarsList] = useState<RailwayEnvVar[]>(envVars);
  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});
  const [railwayToken, setRailwayToken] = useState<string>(() => localStorage.getItem('RAILWAY_API_TOKEN') || '');
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  const handleAddVar = () => {
    setVarsList([...varsList, { key: '', value: '', isSecret: false }]);
  };

  const handleRemoveVar = (index: number) => {
    setVarsList(varsList.filter((_, i) => i !== index));
  };

  const handleToggleSecret = (index: number) => {
    setShowSecrets(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleSaveToken = () => {
    localStorage.setItem('RAILWAY_API_TOKEN', railwayToken);
    setSavedSuccessMsg('Railway APIトークンをブラウザに保持しました。');
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  const handleSaveAllVars = () => {
    const validVars = varsList.filter(v => v.key.trim().length > 0);
    onSaveEnvVars(validVars);
    setSavedSuccessMsg('環境変数をRailwayサーバーに適用・保持しました！');
    setTimeout(() => setSavedSuccessMsg(null), 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20">
            <Sliders className="w-3.5 h-3.5 mr-1.5" />
            Railway API & 環境変数統合コントロール
          </div>
          <h3 className="text-xl font-bold text-slate-100">
            Railway 環境変数 & API 管理
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl">
            Railwayコンテナの環境変数をウェブ画面から指定・確認・更新します。API連携により状態確認も行えます。
          </p>
        </div>

        <button
          onClick={handleSaveAllVars}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95 shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>環境変数を更新・保存</span>
        </button>
      </div>

      {savedSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{savedSuccessMsg}</span>
        </div>
      )}

      {/* Railway Token Card */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-sm">Railway API Personal Token</h4>
              <p className="text-xs text-slate-400">GraphQL API操作用のトークン設定 (Optional)</p>
            </div>
          </div>

          <a
            href="https://railway.app/account/tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
          >
            <span>Railwayでトークンを発行</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="password"
            placeholder="railway_token_xxxxxxxxxxxx"
            value={railwayToken}
            onChange={(e) => setRailwayToken(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleSaveToken}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shrink-0 transition-all"
          >
            Token保存
          </button>
        </div>
      </div>

      {/* Environment Variables Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-100 text-sm flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>環境変数設定 (Environment Variables)</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              登録プログラムから <code className="font-mono text-indigo-300">process.env.KEY</code> や <code className="font-mono text-purple-300">os.environ['KEY']</code> で参照できます。
            </p>
          </div>

          <button
            onClick={handleAddVar}
            className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>環境変数を追加</span>
          </button>
        </div>

        <div className="space-y-3">
          {varsList.map((v, idx) => (
            <div key={idx} className="flex items-center space-x-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              {/* Key Input */}
              <input
                type="text"
                placeholder="変数名 (例: API_SECRET_KEY)"
                value={v.key}
                onChange={(e) => {
                  const updated = [...varsList];
                  updated[idx].key = e.target.value;
                  setVarsList(updated);
                }}
                className="w-1/3 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-indigo-300 font-mono font-semibold focus:outline-none focus:border-indigo-500"
              />

              {/* Value Input */}
              <div className="relative flex-1">
                <input
                  type={showSecrets[idx] ? 'text' : 'password'}
                  placeholder="値 (例: secret_value_123)"
                  value={v.value}
                  onChange={(e) => {
                    const updated = [...varsList];
                    updated[idx].value = e.target.value;
                    setVarsList(updated);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-3 pr-10 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleToggleSecret(idx)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showSecrets[idx] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => handleRemoveVar(idx)}
                className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="変数を削除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
