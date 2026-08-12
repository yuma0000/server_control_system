import React, { useState, useEffect, useCallback } from 'react';
import { Program, LogEntry, ServerEnvVar, SystemStatus } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { ProgramManagerView } from './components/ProgramManagerView';
import { SchedulerView } from './components/SchedulerView';
import { LogViewer } from './components/LogViewer';
import { EnvVarsView } from './components/EnvVarsView';
import { BackupManagerView } from './components/BackupManagerView';
import { ArchiveViewer } from './components/ArchiveViewer';
import { ProgramModal } from './components/ProgramModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [envVars, setEnvVars] = useState<ServerEnvVar[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  // Helper fetch with absolute or relative paths
  const safeFetch = async (endpoint: string, options?: RequestInit) => {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      }
    });
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    return res.json();
  };

  // Sync state from server
  const fetchServerState = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [statusData, syncData] = await Promise.all([
        safeFetch('/api/status').catch(() => null),
        safeFetch('/api/sync').catch(() => null)
      ]);

      if (statusData) setSystemStatus(statusData);
      if (syncData) {
        if (Array.isArray(syncData.programs)) setPrograms(syncData.programs);
        if (Array.isArray(syncData.logs)) setLogs(syncData.logs);
        if (Array.isArray(syncData.envVars)) setEnvVars(syncData.envVars);
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchServerState();
    const interval = setInterval(fetchServerState, 5000);
    return () => clearInterval(interval);
  }, [fetchServerState]);

  // Actions
  const handleRunProgram = async (id: string) => {
    try {
      await safeFetch(`/api/programs/${id}/run`, { method: 'POST' });
      await fetchServerState();
    } catch (err) {
      console.error('Failed to run program:', err);
    }
  };

  const handleStopProgram = async (id: string) => {
    try {
      await safeFetch(`/api/programs/${id}/stop`, { method: 'POST' });
      await fetchServerState();
    } catch (err) {
      console.error('Failed to stop program:', err);
    }
  };

  const handleDeleteProgram = async (id: string) => {
    try {
      await safeFetch(`/api/programs/${id}`, { method: 'DELETE' });
      await fetchServerState();
    } catch (err) {
      console.error('Failed to delete program:', err);
    }
  };

  const handleSaveProgram = async (progData: Partial<Program>) => {
    try {
      await safeFetch('/api/programs', {
        method: 'POST',
        body: JSON.stringify(progData)
      });
      await fetchServerState();
    } catch (err) {
      console.error('Failed to save program:', err);
    }
  };

  const handleClearLogs = async () => {
    try {
      await safeFetch('/api/logs', { method: 'DELETE' });
      await fetchServerState();
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  const handleSaveEnvVars = async (vars: ServerEnvVar[]) => {
    try {
      await safeFetch('/api/env/vars', {
        method: 'POST',
        body: JSON.stringify({ vars })
      });
      await fetchServerState();
    } catch (err) {
      console.error('Failed to save env vars:', err);
    }
  };

  const runningCount = programs.filter(p => p.status === 'RUNNING').length;

  const getTitleForTab = () => {
    switch (activeTab) {
      case 'dashboard': return 'ダッシュボード';
      case 'programs': return 'プログラム管理';
      case 'scheduler': return '時間指定スケジュール';
      case 'logs': return '実行ログ / 監視';
      case 'env': return '環境変数設定';
      case 'backup': return 'バックアップ & 復元';
      case 'archive': return '閲覧用アーカイブ (v1)';
      default: return 'サーバー管理ポータル';
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 antialiased overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemStatus={systemStatus}
        runningCount={runningCount}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={getTitleForTab()}
          systemStatus={systemStatus}
          onRefresh={fetchServerState}
          onOpenCreateModal={() => {
            setEditingProgram(null);
            setModalOpen(true);
          }}
          isSyncing={isSyncing}
          onMenuToggle={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 overflow-y-auto bg-slate-950/50">
          {activeTab === 'dashboard' && (
            <DashboardView
              programs={programs}
              logs={logs}
              systemStatus={systemStatus}
              onRunProgram={handleRunProgram}
              onStopProgram={handleStopProgram}
              onOpenEditModal={(prog) => {
                setEditingProgram(prog);
                setModalOpen(true);
              }}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'programs' && (
            <ProgramManagerView
              programs={programs}
              onRunProgram={handleRunProgram}
              onStopProgram={handleStopProgram}
              onDeleteProgram={handleDeleteProgram}
              onOpenEditModal={(prog) => {
                setEditingProgram(prog);
                setModalOpen(true);
              }}
            />
          )}

          {activeTab === 'scheduler' && (
            <SchedulerView
              programs={programs}
              onOpenEditModal={(prog) => {
                setEditingProgram(prog);
                setModalOpen(true);
              }}
              onRunProgram={handleRunProgram}
            />
          )}

          {activeTab === 'logs' && (
            <LogViewer
              logs={logs}
              onClearLogs={handleClearLogs}
              onRefresh={fetchServerState}
            />
          )}

          {activeTab === 'env' && (
            <EnvVarsView
              envVars={envVars}
              onSaveEnvVars={handleSaveEnvVars}
            />
          )}

          {activeTab === 'backup' && (
            <BackupManagerView
              programs={programs}
              logs={logs}
              envVars={envVars}
              onRefresh={fetchServerState}
            />
          )}

          {activeTab === 'archive' && (
            <ArchiveViewer />
          )}
        </main>
      </div>

      {/* Program Create/Edit Modal */}
      {modalOpen && (
        <ProgramModal
          program={editingProgram}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveProgram}
        />
      )}
    </div>
  );
};

export default App;
