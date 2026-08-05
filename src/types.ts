export type ProgramLanguage = 'nodejs' | 'python' | 'bash' | 'php' | 'ruby';

export type ProgramStatus = 'IDLE' | 'RUNNING' | 'STOPPED' | 'SUCCESS' | 'FAILED';

export interface CodeFile {
  id: string;
  filename: string;
  content: string;
  isEntry?: boolean;
}

export interface ScheduleConfig {
  enabled: boolean;
  timeStr: string; // "HH:MM" e.g., "14:30"
  daysOfWeek: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat (empty array = every day)
  skipIfRunning: boolean; // default true
}

export interface Program {
  id: string;
  name: string;
  description: string;
  language: ProgramLanguage;
  files: CodeFile[];
  code?: string; // Legacy fallback
  status: ProgramStatus;
  schedule: ScheduleConfig;
  timeoutSec: number; // Max execution timeout in seconds
  envVars: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  lastRunDurationMs?: number;
  lastExitCode?: number | null;
  runningPid?: number;
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'STDOUT' | 'STDERR' | 'SKIP';

export interface LogEntry {
  id: string;
  programId: string;
  programName: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: string;
}

export interface RailwayEnvVar {
  key: string;
  value: string;
  isSecret?: boolean;
}

export interface ProcessFileEntry {
  filename: string;
  relativePath: string;
  sizeBytes: number;
  updatedAt: string;
  isEntry?: boolean;
  content?: string;
  isDirectory?: boolean;
}

export interface SystemStatus {
  connected: boolean;
  serverUptimeSec: number;
  memoryUsageMb: number;
  heapUsedMb?: number;
  heapTotalMb?: number;
  rssMb?: number;
  cpuPercent: number;
  runningProgramsCount: number;
  totalProgramsCount: number;
  scheduledProgramsCount: number;
  lastBootTime: string;
  lastSyncedAt: string;
  railwayProjectName?: string;
  railwayServiceName?: string;
}

export interface AppStatePayload {
  programs: Program[];
  logs: LogEntry[];
  railwayEnvVars: RailwayEnvVar[];
  lastSyncedAt: string;
  clientVersion: string;
}
