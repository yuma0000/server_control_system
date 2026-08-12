export type ProgramLanguage = 'nodejs' | 'python' | 'bash';

export type ProgramStatus = 'IDLE' | 'RUNNING' | 'STOPPED' | 'SUCCESS' | 'FAILED';

export interface CodeFile {
  id: string;
  filename: string;
  content: string;
  isEntry?: boolean;
}

export interface ScheduleConfig {
  enabled: boolean;
  timeStr: string; // "HH:MM" e.g. "14:30"
  daysOfWeek?: number[]; // 0 = Sun, 1 = Mon ...
  skipIfRunning: boolean; // default true
}

export interface Program {
  id: string;
  name: string;
  description: string;
  language: ProgramLanguage;
  files: CodeFile[];
  status: ProgramStatus;
  schedule: ScheduleConfig;
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

export interface ServerEnvVar {
  key: string;
  value: string;
  isSecret?: boolean;
}

export interface SystemStatus {
  connected: boolean;
  serverUptimeSec: number;
  memoryUsageMb: number;
  cpuPercent: number;
  runningProgramsCount: number;
  totalProgramsCount: number;
  scheduledProgramsCount: number;
  lastBootTime: string;
  lastSyncedAt: string;
  platformName: string;
}

export interface BackupPayload {
  version: string;
  exportedAt: string;
  programs: Program[];
  logs?: LogEntry[];
  envVars?: ServerEnvVar[];
}
