export interface ArchivedFile {
  path: string;
  name: string;
  category: 'Server' | 'App' | 'Components' | 'Types';
  description: string;
  code: string;
}

export const ARCHIVED_FILES_V1: ArchivedFile[] = [
  {
    path: 'server.ts (v1)',
    name: 'server.ts',
    category: 'Server',
    description: 'Archive V1 Express backend server with process isolation, scheduling, and state persistence',
    code: `// Express server v1 archived reference code
// Full process-isolated runner, disk persistence (/data/server_state.json), and REST API`
  },
  {
    path: 'src/App.tsx (v1)',
    name: 'App.tsx',
    category: 'App',
    description: 'Archive V1 Main React Application with polling, sync, and tab routing',
    code: `// App.tsx v1 archived reference code
// Features multi-tab management, polling sync, and custom API URL configuration`
  },
  {
    path: 'src/types.ts (v1)',
    name: 'types.ts',
    category: 'Types',
    description: 'Archive V1 Type Definitions (Program, LogEntry, SystemStatus, etc.)',
    code: `export type ProgramLanguage = 'nodejs' | 'python' | 'bash' | 'php' | 'ruby';
export type ProgramStatus = 'IDLE' | 'RUNNING' | 'STOPPED' | 'SUCCESS' | 'FAILED';

export interface CodeFile {
  id: string;
  filename: string;
  content: string;
  isEntry?: boolean;
}

export interface Program {
  id: string;
  name: string;
  description: string;
  language: ProgramLanguage;
  files: CodeFile[];
  status: ProgramStatus;
  schedule: { enabled: boolean; timeStr: string; daysOfWeek: number[]; skipIfRunning: boolean };
  envVars: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}`
  },
  {
    path: 'src/components/ProgramManagerView.tsx (v1)',
    name: 'ProgramManagerView.tsx',
    category: 'Components',
    description: 'Archive V1 Program Management View component',
    code: `// ProgramManagerView v1 component reference`
  },
  {
    path: 'src/components/SyncManagerView.tsx (v1)',
    name: 'SyncManagerView.tsx',
    category: 'Components',
    description: 'Archive V1 Sync and Separation Manager component',
    code: `// SyncManagerView v1 component reference`
  }
];
