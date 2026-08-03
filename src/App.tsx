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
import { Program, LogEntry, RailwayEnvVar, SystemStatus, AppStatePayload } from './types';

const LOCAL_STORAGE_KEY = 'RAILWAY_SERVER_MGMT_STATE_V1';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const [programs, setPrograms] = useState<Program[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [railwayEnvVars, setRailwayEnvVars] = useState<RailwayEnvVar[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Editor Modal state
  const [isEditorModalOpen, setIsEditorModalOpen] = useState<boolean>(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);


  // Fetch full state from Express backend
  const fetchStateFromBackend = useCallback(async () => {
    try {
      const [syncRes, statusRes] = await Promise.all([
        fetch('/api/sync'),
        fetch('/api/status')
      ]);

      const isSyncJson = syncRes.ok && syncRes.headers.get('content-type')?.includes('application/json');
      if (isSyncJson) {
        const syncData = await syncRes.json();
        if (Array.isArray(syncData.programs)) {
          setPrograms(syncData.programs);
        }
        if (Array.isArray(syncData.logs)) {
          setLogs(syncData.logs);
        }
        if (Array.isArray(syncData.railwayEnvVars)) {
          setRailwayEnvVars(syncData.railwayEnvVars);
        }
        if (syncData.lastSyncedAt) {
          setLastSyncedAt(syncData.lastSyncedAt);
        }

        // Also update LocalStorage backup on client
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
          programs: syncData.programs,
          railwayEnvVars: syncData.railwayEnvVars,
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
    }
  }, []);

  // Initial Sync & Boot Logic
  useEffect(() => {
    const initBootSync = async () => {
      setIsSyncing(true);
      
      try {
        const [syncRes, statusRes] = await Promise.all([
          fetch('/api/sync'),
          fetch('/api/status')
        ]);

        let serverHasPrograms = false;

        const isSyncJson = syncRes.ok && syncRes.headers.get('content-type')?.includes('application/json');
        if (isSyncJson) {
          const syncData = await syncRes.json();
          if (Array.isArray(syncData.programs)) {
            setPrograms(syncData.programs);
            if (syncData.programs.length > 0) {
              serverHasPrograms = true;
            }
          }
          if (Array.isArray(syncData.logs)) setLogs(syncData.logs);
          if (Array.isArray(syncData.railwayEnvVars)) setRailwayEnvVars(syncData.railwayEnvVars);
          if (syncData.lastSyncedAt) setLastSyncedAt(syncData.lastSyncedAt);

          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
            programs: syncData.programs,
            railwayEnvVars: syncData.railwayEnvVars,
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

    // Live polling every 3.5 seconds
    const interval = setInterval(fetchStateFromBackend, 3500);
    return () => clearInterval(interval);
  }, [fetchStateFromBackend]);

  // Actions
  const handleRunProgram = async (id: string) => {
    try {
      await fetch(`/api/programs/${id}/run`, { method: 'POST' });
      fetchStateFromBackend();
    } catch (err) {
      console.error('Error running program:', err);
    }
  };

  const handleStopProgram = async (id: string) => {
    try {
      await fetch(`/api/programs/${id}/stop`, { method: 'POST' });
      fetchStateFromBackend();
    } catch (err) {
      console.error('Error stopping program:', err);
    }
  };

  const handleSaveProgram = async (prog: Program) => {
    try {
      await fetch('/api/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prog)
      });
      fetchStateFromBackend();
    } catch (err) {
      console.error('Error saving program:', err);
    }
  };

  const handleDeleteProgram = async (id: string) => {
    try {
      // 1. Optimistic state update in React UI
      const nextPrograms = programs.filter(p => p.id !== id);
      setPrograms(nextPrograms);

      // 2. Immediately update local storage so deleted items won't restore
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
        programs: nextPrograms,
        railwayEnvVars,
        lastSyncedAt: new Date().toISOString()
      }));

      // 3. Perform backend API delete
      await fetch(`/api/programs/${id}`, { method: 'DELETE' });

      // 4. Re-sync backend state
      await fetchStateFromBackend();
    } catch (err) {
      console.error('Error deleting program:', err);
      fetchStateFromBackend();
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programs,
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
      await fetch('/api/logs', { method: 'DELETE' });
      fetchStateFromBackend();
    } catch (err) {
      console.error('Error clearing logs:', err);
    }
  };

  const handleSaveEnvVars = async (vars: RailwayEnvVar[]) => {
    try {
      await fetch('/api/railway/vars', {
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
      railwayEnvVars,
      lastSyncedAt: new Date().toISOString(),
      clientVersion: '1.0.0'
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `railway-server-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
          await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              programs: data.programs,
              railwayEnvVars: data.railwayEnvVars || [],
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
      case 'railway': return 'Railway API & 環境変数';
      case 'spec': return '技術仕様書 & システムドキュメント';
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
          subtitle="Railway サーバープログラム統合管理システム"
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
