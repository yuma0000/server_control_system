import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ProgramManagerView } from './components/ProgramManagerView';
import { CodeEditorModal } from './components/CodeEditorModal';
import { SchedulerView } from './components/SchedulerView';
import { SyncManagerView } from './components/SyncManagerView';
import { LogViewer } from './components/LogViewer';
import { RailwayApiView } from './components/RailwayApiView';
import { TechSpecView } from './components/TechSpecView';
import { Program, LogEntry, ServerEnvVar, SystemStatus, AppStatePayload } from './types';

const LOCAL_STORAGE_KEY = 'SERVER_MGMT_STATE_V1';
const API_BASE_URL_KEY = 'CUSTOM_API_BASE_URL';
const POLL_INTERVAL_KEY = 'POLL_INTERVAL_SEC';
const LIGHT_SYNC_KEY = 'USE_LIGHT_SYNC';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const [programs, setPrograms] = useState<Program[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.programs)) return parsed.programs;
      }
    } catch (_) {}
    return [];
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [railwayEnvVars, setRailwayEnvVars] = useState<ServerEnvVar[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const vars = parsed.serverEnvVars || parsed.railwayEnvVars;
        if (Array.isArray(vars)) return vars;
      }
    } catch (_) {}
    return [];
  });
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Network Optimization & Separation States
  const [customApiBaseUrl, setCustomApiBaseUrl] = useState<string>(() => {
    const metaEnv = (import.meta as any).env || {};
    return localStorage.getItem(API_BASE_URL_KEY) || 
           localStorage.getItem('RAILWAY_CUSTOM_API_BASE_URL') || 
           (metaEnv.VITE_API_URL as string) || 
           (metaEnv.VITE_SERVER_URL as string) || 
           '';
  });
  const [pollIntervalSec, setPollIntervalSec] = useState<number>(() => {
    const val = localStorage.getItem(POLL_INTERVAL_KEY) || localStorage.getItem('RAILWAY_POLL_INTERVAL_SEC');
    return parseInt(val || '5', 10);
  });
  const [useLightSync, setUseLightSync] = useState<boolean>(() => {
    const val = localStorage.getItem(LIGHT_SYNC_KEY) ?? localStorage.getItem('RAILWAY_USE_LIGHT_SYNC');
    return val !== 'false';
  });

  // Editor Modal state
  const [isEditorModalOpen, setIsEditorModalOpen] = useState<boolean>(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  // Helper to format endpoint with custom API server URL
  const getApiUrl = useCallback((path: string) => {
    let base = customApiBaseUrl.trim().replace(/\/+$/, '');
    if (!base) {
      return path.startsWith('/') ? path : '/' + path;
    }

    // Auto-prefix protocol if missing
    if (!base.startsWith('http://') && !base.startsWith('https://')) {
      base = `https://${base}`;
    }

    // Auto-upgrade http:// to https:// on https pages to avoid browser Mixed Content blocking
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      if (base.startsWith('http://') && !base.includes('localhost') && !base.includes('127.0.0.1')) {
        base = base.replace(/^http:\/\//, 'https://');
      }
    }

    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return `${base}${cleanPath}`;
  }, [customApiBaseUrl]);

  // Safe helper to fetch JSON endpoints without throwing network/cors/syntax errors
  const safeFetchJson = useCallback(async (path: string) => {
    try {
      const url = getApiUrl(path);
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return null;
      return await res.json();
    } catch (err) {
      return null;
    }
  }, [getApiUrl]);

  // Network handlers
  const handleSaveApiBaseUrl = (url: string) => {
    setCustomApiBaseUrl(url);
    localStorage.setItem(API_BASE_URL_KEY, url);
  };

  const handleSavePollIntervalSec = (sec: number) => {
    setPollIntervalSec(sec);
    localStorage.setItem(POLL_INTERVAL_KEY, sec.toString());
  };

  const handleToggleLightSync = (enabled: boolean) => {
    setUseLightSync(enabled);
    localStorage.setItem(LIGHT_SYNC_KEY, enabled ? 'true' : 'false');
  };

  // Fetch full state from Express backend
  const fetchStateFromBackend = useCallback(async () => {
    try {
      const syncPath = `/api/sync${useLightSync ? '?light=true' : ''}`;
      const [syncData, statusData] = await Promise.all([
        safeFetchJson(syncPath),
        safeFetchJson('/api/status')
      ]);

      let syncSuccess = false;
      let statusSuccess = false;

      if (syncData) {
        syncSuccess = true;
        if (Array.isArray(syncData.programs)) {
          if (syncData.isLight) {
            setPrograms(prev => syncData.programs.map((lp: Program) => {
              const existing = prev.find(p => p.id === lp.id);
              if (!existing) return lp;
              return {
                ...existing,
                ...lp,
                files: existing.files && existing.files.length > 0 ? existing.files : lp.files
              };
            }));
          } else {
            setPrograms(syncData.programs);
          }
        }
        if (Array.isArray(syncData.logs)) {
          setLogs(syncData.logs);
        }
        const vars = syncData.serverEnvVars || syncData.railwayEnvVars;
        if (Array.isArray(vars)) {
          setRailwayEnvVars(vars);
        }
        if (syncData.lastSyncedAt) {
          setLastSyncedAt(syncData.lastSyncedAt);
        }

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
          programs: syncData.programs,
          serverEnvVars: vars,
          lastSyncedAt: new Date().toISOString()
        }));
      }

      if (statusData) {
        statusSuccess = true;
        setSystemStatus({ ...statusData, connected: true });
      }

      if (!statusSuccess && !syncSuccess) {
        setSystemStatus(prev => ({
          connected: false,
          serverUptimeSec: prev?.serverUptimeSec || 0,
          memoryUsageMb: prev?.memoryUsageMb || 0,
          heapUsedMb: prev?.heapUsedMb || 0,
          heapTotalMb: prev?.heapTotalMb || 0,
          rssMb: prev?.rssMb || 0,
          cpuPercent: prev?.cpuPercent || 0,
          runningProgramsCount: prev?.runningProgramsCount || 0,
          totalProgramsCount: prev?.totalProgramsCount || 0,
          scheduledProgramsCount: prev?.scheduledProgramsCount || 0,
          lastBootTime: prev?.lastBootTime || '',
          lastSyncedAt: prev?.lastSyncedAt || '',
          platformName: '未接続 / オフライン'
        }));
      }
    } catch (err) {
      console.error('Error fetching state from backend:', err);
      setSystemStatus(prev => ({
        connected: false,
        serverUptimeSec: prev?.serverUptimeSec || 0,
        memoryUsageMb: prev?.memoryUsageMb || 0,
        heapUsedMb: prev?.heapUsedMb || 0,
        heapTotalMb: prev?.heapTotalMb || 0,
        rssMb: prev?.rssMb || 0,
        cpuPercent: prev?.cpuPercent || 0,
        runningProgramsCount: prev?.runningProgramsCount || 0,
        totalProgramsCount: prev?.totalProgramsCount || 0,
        scheduledProgramsCount: prev?.scheduledProgramsCount || 0,
        lastBootTime: prev?.lastBootTime || '',
        lastSyncedAt: prev?.lastSyncedAt || '',
        platformName: '未接続 / オフライン'
      }));
    }
  }, [safeFetchJson, useLightSync]);

  // Initial Sync & Boot Logic
  useEffect(() => {
    const initBootSync = async () => {
      setIsSyncing(true);
      
      try {
        const [syncData, statusData] = await Promise.all([
          safeFetchJson('/api/sync'),
          safeFetchJson('/api/status')
        ]);

        let success = false;

        if (syncData) {
          success = true;
          if (Array.isArray(syncData.programs)) setPrograms(syncData.programs);
          if (Array.isArray(syncData.logs)) setLogs(syncData.logs);
          const vars = syncData.serverEnvVars || syncData.railwayEnvVars;
          if (Array.isArray(vars)) setRailwayEnvVars(vars);
          if (syncData.lastSyncedAt) setLastSyncedAt(syncData.lastSyncedAt);

          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
            programs: syncData.programs,
            serverEnvVars: vars,
            lastSyncedAt: new Date().toISOString()
          }));
        }

        if (statusData) {
          success = true;
          setSystemStatus({ ...statusData, connected: true });
        }

        if (!success) {
          setSystemStatus({
            connected: false,
            serverUptimeSec: 0,
            memoryUsageMb: 0,
            heapUsedMb: 0,
            heapTotalMb: 0,
            rssMb: 0,
            cpuPercent: 0,
            runningProgramsCount: 0,
            totalProgramsCount: programs.length,
            scheduledProgramsCount: 0,
            lastBootTime: '',
            lastSyncedAt: '',
            platformName: '未接続 / オフライン'
          });
        }
      } catch (err) {
        console.error('Error during init boot sync:', err);
        setSystemStatus({
          connected: false,
          serverUptimeSec: 0,
          memoryUsageMb: 0,
          heapUsedMb: 0,
          heapTotalMb: 0,
          rssMb: 0,
          cpuPercent: 0,
          runningProgramsCount: 0,
          totalProgramsCount: programs.length,
          scheduledProgramsCount: 0,
          lastBootTime: '',
          lastSyncedAt: '',
          platformName: '未接続 / オフライン'
        });
      } finally {
        setIsSyncing(false);
      }
    };

    initBootSync();

    if (pollIntervalSec <= 0) return; // Manual mode only

    const interval = setInterval(fetchStateFromBackend, pollIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [fetchStateFromBackend, getApiUrl, pollIntervalSec]);

  // Actions
  const handleRunProgram = async (id: string) => {
    setPrograms(prev => prev.map(p => p.id === id ? { ...p, status: 'RUNNING' } : p));
    setIsProcessing(true);
    try {
      const res = await fetch(getApiUrl(`/api/programs/${id}/run`), { method: 'POST' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.warn('Run response notification:', errJson.error || 'Duplicate execution blocked.');
      }
      await fetchStateFromBackend();
    } catch (err) {
      console.error('Error running program:', err);
      await fetchStateFromBackend();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopProgram = async (id: string) => {
    setPrograms(prev => prev.map(p => p.id === id ? { ...p, status: 'STOPPED', runningPid: undefined } : p));
    setIsProcessing(true);
    try {
      await fetch(getApiUrl(`/api/programs/${id}/stop`), { method: 'POST' });
      await fetchStateFromBackend();
    } catch (err) {
      console.error('Error stopping program:', err);
      await fetchStateFromBackend();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveProgram = async (prog: Program) => {
    setIsProcessing(true);
    try {
      await fetch(getApiUrl('/api/programs'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prog)
      });
      await fetchStateFromBackend();
    } catch (err) {
      console.error('Error saving program:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteProgram = async (id: string) => {
    setIsProcessing(true);
    try {
      const nextPrograms = programs.filter(p => p.id !== id);
      setPrograms(nextPrograms);

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
        programs: nextPrograms,
        serverEnvVars: railwayEnvVars,
        lastSyncedAt: new Date().toISOString()
      }));

      await fetch(getApiUrl(`/api/programs/${id}`), { method: 'DELETE' });
      await fetchStateFromBackend();
    } catch (err) {
      console.error('Error deleting program:', err);
      fetchStateFromBackend();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await fetch(getApiUrl('/api/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programs,
          serverEnvVars: railwayEnvVars,
          railwayEnvVars,
          overrideMode: 'client'
        })
      });
      await fetchStateFromBackend();
    } catch (err) {
      console.error('Error syncing:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      await fetch(getApiUrl('/api/logs'), { method: 'DELETE' });
      fetchStateFromBackend();
    } catch (err) {
      console.error('Error clearing logs:', err);
    }
  };

  const handleSaveEnvVars = async (vars: ServerEnvVar[]) => {
    try {
      await fetch(getApiUrl('/api/env/vars'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vars })
      });
      setRailwayEnvVars(vars);
      fetchStateFromBackend();
    } catch (err) {
      console.error('Error saving env vars:', err);
    }
  };

  // Export Backup File
  const handleExportBackup = () => {
    const payload: AppStatePayload = {
      programs,
      logs: logs.slice(0, 300),
      serverEnvVars: railwayEnvVars,
      railwayEnvVars,
      lastSyncedAt: new Date().toISOString(),
      clientVersion: '3.0.0'
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `server-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Backup File
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);
        if (Array.isArray(data.programs)) {
          setIsSyncing(true);
          const vars = data.serverEnvVars || data.railwayEnvVars || [];
          await fetch(getApiUrl('/api/sync'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              programs: data.programs,
              serverEnvVars: vars,
              railwayEnvVars: vars,
              overrideMode: 'client'
            })
          });
          await fetchStateFromBackend();
          setIsSyncing(false);
        }
      } catch (err) {
        console.error('Failed to import backup:', err);
      }
    };
    reader.readAsText(file);
  };

  const handleOpenEditModal = (prog?: Program | null) => {
    setEditingProgram(prog || null);
    setIsEditorModalOpen(true);
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'ダッシュボード概要';
      case 'programs': return 'プログラム管理 & サンドボックス';
      case 'scheduler': return '時間指定（HH:MM）スケジュール';
      case 'logs': return 'リアルタイム実行ログ / 問題確認';
      case 'sync': return '永続化データ同期 & バックアップ';
      case 'railway': return 'サーバー環境変数 & API設定';
      case 'spec': return '分離・デプロイ仕様書 & ドキュメント';
      default: return '管理画面';
    }
  };

  const runningCount = programs.filter(p => p.status === 'RUNNING').length;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemStatus={systemStatus}
        runningCount={runningCount}
        mobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          title={getTabTitle()}
          subtitle="ユニバーサル Node.js サーバープログラム統合管理システム"
          systemStatus={systemStatus}
          onRefresh={handleManualSync}
          onOpenCreateModal={() => handleOpenEditModal(null)}
          onOpenSyncSettings={() => setActiveTab('sync')}
          isSyncing={isSyncing}
          onMenuToggle={() => setIsMobileMenuOpen(true)}
        />

        {/* Reconnecting / Offline Helper Banner */}
        {systemStatus && !systemStatus.connected && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-amber-200 gap-2 shrink-0 animate-fadeIn">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              <span>
                <strong>再接続中 / API未接続:</strong> Render のコールドスタート（起動待ち 30〜60秒）または Vercel から Render サーバー（例: <code className="bg-amber-950/60 px-1 py-0.5 rounded text-amber-300 font-mono">https://my-app.onrender.com</code>）への URL 設定が必要です。
              </span>
            </div>
            <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto justify-end">
              <button
                onClick={() => setActiveTab('sync')}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm transition-all text-xs"
              >
                接続先 API URL を設定
              </button>
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700 transition-all text-xs disabled:opacity-50"
              >
                {isSyncing ? '同期中...' : '再接続試行'}
              </button>
            </div>
          </div>
        )}

        {/* Dynamic View Tab Rendering */}
        <main className="flex-1 overflow-y-auto bg-slate-950/90 p-3 sm:p-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              programs={programs}
              logs={logs}
              systemStatus={systemStatus}
              onRunProgram={handleRunProgram}
              onStopProgram={handleStopProgram}
              onOpenEditModal={handleOpenEditModal}
              onSync={handleManualSync}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'programs' && (
            <ProgramManagerView
              programs={programs}
              onRunProgram={handleRunProgram}
              onStopProgram={handleStopProgram}
              onDeleteProgram={handleDeleteProgram}
              onOpenEditModal={handleOpenEditModal}
              isProcessing={isProcessing}
            />
          )}

          {activeTab === 'scheduler' && (
            <SchedulerView
              programs={programs}
              onOpenEditModal={handleOpenEditModal}
              onRunProgram={handleRunProgram}
            />
          )}

          {activeTab === 'logs' && (
            <LogViewer
              logs={logs}
              programs={programs}
              onClearLogs={handleClearLogs}
              onRefreshLogs={fetchStateFromBackend}
            />
          )}

          {activeTab === 'sync' && (
            <SyncManagerView
              programs={programs}
              railwayEnvVars={railwayEnvVars}
              systemStatus={systemStatus}
              onSync={handleManualSync}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              isSyncing={isSyncing}
              lastSyncedAt={lastSyncedAt}
              customApiBaseUrl={customApiBaseUrl}
              onSaveApiBaseUrl={handleSaveApiBaseUrl}
              pollIntervalSec={pollIntervalSec}
              onSavePollIntervalSec={handleSavePollIntervalSec}
              useLightSync={useLightSync}
              onToggleLightSync={handleToggleLightSync}
            />
          )}

          {activeTab === 'railway' && (
            <RailwayApiView
              envVars={railwayEnvVars}
              onSaveEnvVars={handleSaveEnvVars}
            />
          )}

          {activeTab === 'spec' && (
            <TechSpecView />
          )}
        </main>
      </div>

      {/* Code Editor & Sandbox Modal */}
      <CodeEditorModal
        program={editingProgram}
        isOpen={isEditorModalOpen}
        onClose={() => {
          setIsEditorModalOpen(false);
          setEditingProgram(null);
        }}
        onSave={handleSaveProgram}
        onRunTest={handleRunProgram}
        onStopTest={handleStopProgram}
      />
    </div>
  );
}
