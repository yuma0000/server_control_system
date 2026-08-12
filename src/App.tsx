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

  const [programs, setPrograms] = useState<Program[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [railwayEnvVars, setRailwayEnvVars] = useState<ServerEnvVar[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Network Optimization & Separation States
  const [customApiBaseUrl, setCustomApiBaseUrl] = useState<string>(() => {
    return localStorage.getItem(API_BASE_URL_KEY) || localStorage.getItem('RAILWAY_CUSTOM_API_BASE_URL') || '';
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
    const base = customApiBaseUrl.trim().replace(/\/+$/, '');
    if (!base) return path;
    return `${base}${path.startsWith('/') ? path : '/' + path}`;
  }, [customApiBaseUrl]);

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
      const [syncRes, statusRes] = await Promise.all([
        fetch(getApiUrl(syncPath)),
        fetch(getApiUrl('/api/status'))
      ]);

      const isSyncJson = syncRes.ok && syncRes.headers.get('content-type')?.includes('application/json');
      if (isSyncJson) {
        const syncData = await syncRes.json();
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

      const isStatusJson = statusRes.ok && statusRes.headers.get('content-type')?.includes('application/json');
      if (isStatusJson) {
        const statusData = await statusRes.json();
        setSystemStatus(statusData);
      }
    } catch (err) {
      console.error('Error fetching state from backend:', err);
      setSystemStatus(prev => prev ? { ...prev, connected: false } : null);
    }
  }, [getApiUrl, useLightSync]);

  // Initial Sync & Boot Logic
  useEffect(() => {
    const initBootSync = async () => {
      setIsSyncing(true);
      
      try {
        const [syncRes, statusRes] = await Promise.all([
          fetch(getApiUrl('/api/sync')),
          fetch(getApiUrl('/api/status'))
        ]);

        const isSyncJson = syncRes.ok && syncRes.headers.get('content-type')?.includes('application/json');
        if (isSyncJson) {
          const syncData = await syncRes.json();
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

        const isStatusJson = statusRes.ok && statusRes.headers.get('content-type')?.includes('application/json');
        if (isStatusJson) {
          const statusData = await statusRes.json();
          setSystemStatus(statusData);
        }
      } catch (err) {
        console.error('Error during init boot sync:', err);
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
          await fetch('/api/sync', {
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
          isSyncing={isSyncing}
          onMenuToggle={() => setIsMobileMenuOpen(true)}
        />

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
