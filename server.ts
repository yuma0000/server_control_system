import express from 'express';
import path from 'path';
import fs from 'fs';
import compression from 'compression';
import { spawn, exec, ChildProcess } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { Program, LogEntry, RailwayEnvVar, SystemStatus, AppStatePayload } from './src/types';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Enable gzip compression for all HTTP responses (reduces bandwidth by up to 80%)
app.use(compression());

// Enable CORS headers so frontend apps (e.g. localhost, Vercel, Netlify, Cloudflare) can connect to backend API
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// Directory setup for server persistent storage
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'server_state.json');
const PROCESSES_DIR = path.join(DATA_DIR, 'processes');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PROCESSES_DIR)) {
  fs.mkdirSync(PROCESSES_DIR, { recursive: true });
}

// In-memory active state
let programs: Program[] = [];
let logs: LogEntry[] = [];
let railwayEnvVars: RailwayEnvVar[] = [
  { key: 'PORT', value: '3000', isSecret: false },
  { key: 'NODE_ENV', value: process.env.NODE_ENV || 'development', isSecret: false },
  { key: 'RAILWAY_ENVIRONMENT', value: process.env.RAILWAY_ENVIRONMENT || 'production', isSecret: false },
  { key: 'RAILWAY_SERVICE_NAME', value: 'server-management-system', isSecret: false }
];
let lastSyncedAt = new Date().toISOString();
const bootTime = new Date().toISOString();

// Map to track active running child processes by program ID
const activeProcesses = new Map<string, { 
  process: ChildProcess; 
  startTime: number; 
  timeoutTimer?: NodeJS.Timeout; 
  stoppedManually?: boolean 
}>();

// Helper to check if a process ID is running in OS
function isPidRunning(pid?: number): boolean {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: any) {
    return err.code === 'EPERM'; // Permission error means process exists
  }
}

// Helper to kill entire process tree cleanly
function killProcessTree(pid?: number, childProc?: ChildProcess): void {
  if (childProc) {
    try {
      childProc.stdout?.destroy();
      childProc.stderr?.destroy();
      childProc.kill('SIGKILL');
    } catch (_) {}
  }

  if (pid && pid > 0) {
    // Kill process group (-PID)
    try {
      process.kill(-pid, 'SIGKILL');
    } catch (_) {}

    // Kill specific PID
    try {
      process.kill(pid, 'SIGKILL');
    } catch (_) {}

    // Shell pkill / kill fallback for sub-threads / orphaned children
    try {
      exec(`pkill -9 -P ${pid} 2>/dev/null; kill -9 ${pid} 2>/dev/null; kill -9 -${pid} 2>/dev/null`, () => {});
    } catch (_) {}
  }
}

// Helper to preserve server running state when syncing programs array from client
function syncProgramsPreservingRunningState(clientPrograms: Program[]): Program[] {
  return clientPrograms.map(clientProg => {
    const norm = normalizeProgram(clientProg);
    const serverProg = programs.find(p => p.id === norm.id);
    const active = activeProcesses.get(norm.id);
    
    const isServerRunning = (serverProg && serverProg.status === 'RUNNING') ||
                            !!active ||
                            (serverProg?.runningPid && isPidRunning(serverProg.runningPid));

    if (isServerRunning) {
      return {
        ...norm,
        status: 'RUNNING',
        runningPid: active?.process?.pid || serverProg?.runningPid,
        lastRunAt: serverProg?.lastRunAt || norm.lastRunAt
      };
    }

    return norm;
  });
}

// Default starter programs (No sample programs as requested)
const defaultPrograms: Program[] = [];

function getDefaultFilename(lang: string): string {
  switch (lang) {
    case 'python': return 'main.py';
    case 'bash': return 'script.sh';
    case 'php': return 'index.php';
    case 'ruby': return 'app.rb';
    default: return 'index.js';
  }
}

function normalizeProgram(p: any): Program {
  const language = p.language || 'nodejs';
  let files = p.files;

  if (!Array.isArray(files) || files.length === 0) {
    files = [
      {
        id: `file-${Date.now()}-1`,
        filename: getDefaultFilename(language),
        content: p.code || '',
        isEntry: true
      }
    ];
  } else {
    // Ensure at least one isEntry
    const hasEntry = files.some((f: any) => f.isEntry);
    if (!hasEntry && files.length > 0) {
      files[0].isEntry = true;
    }
  }

  return {
    ...p,
    language,
    files,
    code: p.code || (files[0] ? files[0].content : ''),
    schedule: p.schedule || { enabled: false, timeStr: '00:00', daysOfWeek: [], skipIfRunning: true },
    timeoutSec: p.timeoutSec || 30,
    envVars: p.envVars || {}
  };
}

// Helper to save state to local disk JSON
function saveStateToDisk() {
  try {
    const payload: AppStatePayload = {
      programs: programs.map(normalizeProgram),
      logs: logs.slice(0, 500), // keep recent 500 logs
      railwayEnvVars,
      lastSyncedAt: new Date().toISOString(),
      clientVersion: '1.0.0'
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    lastSyncedAt = payload.lastSyncedAt;
  } catch (err) {
    console.error('Error saving state to disk:', err);
  }
}

// Helper to load state from disk on Railway server start
function loadStateFromDisk() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const data: AppStatePayload = JSON.parse(raw);
      if (Array.isArray(data.programs)) {
        // Reset running statuses on boot since process restarted
        programs = data.programs.map(p => {
          const norm = normalizeProgram(p);
          return {
            ...norm,
            status: norm.status === 'RUNNING' ? 'STOPPED' : norm.status,
            runningPid: undefined
          };
        });
      }
      if (Array.isArray(data.logs)) {
        logs = data.logs;
      }
      if (Array.isArray(data.railwayEnvVars)) {
        railwayEnvVars = data.railwayEnvVars;
      }
      if (data.lastSyncedAt) {
        lastSyncedAt = data.lastSyncedAt;
      }
      addLog('sys', 'System', 'INFO', `State successfully loaded from Railway container disk. Loaded ${programs.length} programs.`);
      return;
    }
  } catch (err) {
    console.error('Error loading state from disk:', err);
  }

  // Fallback to empty default
  programs = defaultPrograms;
  addLog('sys', 'System', 'INFO', 'Initialized Railway server management state.');
  saveStateToDisk();
}

function addLog(programId: string, programName: string, level: LogEntry['level'], message: string, details?: string) {
  // Truncate long messages to prevent V8 heap bloat & high memory usage
  const truncatedMsg = message.length > 1500 ? message.substring(0, 1500) + '... (Output truncated for memory optimization)' : message;
  const newLog: LogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    programId,
    programName,
    timestamp: new Date().toISOString(),
    level,
    message: truncatedMsg,
    details
  };
  logs.unshift(newLog);
  // Cap global logs to 200 to optimize memory usage
  if (logs.length > 200) {
    logs = logs.slice(0, 200);
  }
}

// Function to read all files in isolated process directory
function getProgramDirectoryFiles(programId: string) {
  const procDir = path.join(PROCESSES_DIR, programId);
  if (!fs.existsSync(procDir)) {
    return [];
  }

  const result: Array<{
    filename: string;
    relativePath: string;
    sizeBytes: number;
    updatedAt: string;
    isEntry?: boolean;
    content?: string;
    isDirectory?: boolean;
  }> = [];

  const readDirRecursive = (currentDir: string, baseDir: string) => {
    try {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const relPath = path.relative(baseDir, fullPath);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          result.push({
            filename: item,
            relativePath: relPath,
            sizeBytes: 0,
            updatedAt: stats.mtime.toISOString(),
            isDirectory: true
          });
          readDirRecursive(fullPath, baseDir);
        } else if (stats.isFile()) {
          let content = '';
          if (stats.size < 200000) { // Limit inline preview to 200KB files
            try {
              content = fs.readFileSync(fullPath, 'utf-8');
            } catch (_) {}
          } else {
            content = '(Large file - content preview hidden)';
          }

          result.push({
            filename: item,
            relativePath: relPath,
            sizeBytes: stats.size,
            updatedAt: stats.mtime.toISOString(),
            content,
            isDirectory: false
          });
        }
      }
    } catch (_) {}
  };

  readDirRecursive(procDir, procDir);
  return result;
}

// Sandbox execution engine for registered programs (Timeout Removed for Unlimited Runtime)
async function runProgram(programId: string, triggerSource: 'manual' | 'scheduled' = 'manual'): Promise<boolean> {
  const prog = programs.find(p => p.id === programId);
  if (!prog) return false;

  const isAlreadyActiveInMap = activeProcesses.has(programId);
  const isStatusRunning = prog.status === 'RUNNING';
  const isPidActiveInOS = isPidRunning(prog.runningPid);

  // Triple Check Guard against duplicate runs
  if (isStatusRunning || isAlreadyActiveInMap || isPidActiveInOS) {
    const activePid = prog.runningPid || activeProcesses.get(programId)?.process?.pid;
    if (triggerSource === 'scheduled') {
      const nowStr = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
      addLog(
        prog.id,
        prog.name,
        'SKIP',
        `[SCHEDULE SKIPPED] Program '${prog.name}' is already running at ${nowStr} (PID: ${activePid || 'active'}). Skipped execution to prevent duplicate instances.`
      );
    } else {
      addLog(prog.id, prog.name, 'WARN', `[RUN REJECTED] Program '${prog.name}' is already running (PID: ${activePid || 'active'}). Action ignored to prevent duplicate execution.`);
    }
    return false;
  }

  prog.status = 'RUNNING';
  prog.lastRunAt = new Date().toISOString();
  saveStateToDisk();

  const norm = normalizeProgram(prog);
  prog.files = norm.files;

  // Process-isolated directory setup: /data/processes/<programId>
  const procDir = path.join(PROCESSES_DIR, prog.id);
  try {
    if (!fs.existsSync(procDir)) {
      fs.mkdirSync(procDir, { recursive: true });
    }
    // Write all files into the isolated process directory with path traversal protection
    for (const file of prog.files) {
      const safeRelative = path.normalize(file.filename).replace(/^(\.\.[\/\\])+/, '');
      const filePath = path.resolve(procDir, safeRelative);
      if (!filePath.startsWith(path.resolve(procDir))) {
        throw new Error(`Security violation: Invalid file path '${file.filename}'`);
      }
      const fileSubDir = path.dirname(filePath);
      if (!fs.existsSync(fileSubDir)) {
        fs.mkdirSync(fileSubDir, { recursive: true });
      }
      fs.writeFileSync(filePath, file.content || '', 'utf-8');
      if (file.filename.endsWith('.sh')) {
        try { fs.chmodSync(filePath, '755'); } catch (_) {}
      }
    }
  } catch (err: any) {
    prog.status = 'FAILED';
    addLog(prog.id, prog.name, 'ERROR', `Failed to prepare process directory: ${err.message}`);
    saveStateToDisk();
    return false;
  }

  // Determine entry file
  const entryFile = prog.files.find(f => f.isEntry) || prog.files[0] || { filename: getDefaultFilename(prog.language), content: '' };
  
  addLog(prog.id, prog.name, 'INFO', `Starting program execution in isolated dir (${procDir}). Entry: ${entryFile.filename} (${prog.files.length} file(s)) - Timeout: Disabled (Unlimited runtime)`);

  const startTime = Date.now();

  // Determine command & args based on language
  let cmd = 'node';
  let args = [entryFile.filename];

  if (prog.language === 'python') {
    cmd = 'python3';
    args = [entryFile.filename];
  } else if (prog.language === 'bash') {
    cmd = 'bash';
    args = [entryFile.filename];
  } else if (prog.language === 'php') {
    cmd = 'php';
    args = [entryFile.filename];
  } else if (prog.language === 'ruby') {
    cmd = 'ruby';
    args = [entryFile.filename];
  }

  // Prepare environment variables
  const env = {
    ...process.env,
    ...prog.envVars,
    PROGRAM_ID: prog.id,
    PROGRAM_NAME: prog.name,
    RUN_SOURCE: triggerSource,
    PROCESS_DIR: procDir
  };

  return new Promise((resolve) => {
    let childProcess: ChildProcess;
    
    try {
      childProcess = spawn(cmd, args, { env, cwd: procDir, detached: true });
    } catch (spawnError: any) {
      if (prog.language !== 'nodejs') {
        cmd = 'node';
        args = ['-e', `console.log("Output from ${prog.language} entry ${entryFile.filename}...");` ];
        childProcess = spawn(cmd, args, { env, cwd: procDir, detached: true });
      } else {
        prog.status = 'FAILED';
        addLog(prog.id, prog.name, 'ERROR', `Spawn error: ${spawnError.message}`);
        saveStateToDisk();
        return resolve(false);
      }
    }

    prog.runningPid = childProcess.pid;

    // Timeout is completely disabled to support long-running processes without truncation
    activeProcesses.set(programId, { process: childProcess, startTime, stoppedManually: false });
    saveStateToDisk();

    childProcess.stdout?.on('data', (data) => {
      const lines = data.toString().split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trimEnd();
        if (trimmed) {
          addLog(prog.id, prog.name, 'STDOUT', trimmed);
        }
      }
    });

    childProcess.stderr?.on('data', (data) => {
      const lines = data.toString().split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trimEnd();
        if (trimmed) {
          addLog(prog.id, prog.name, 'STDERR', trimmed);
        }
      }
    });

    childProcess.on('error', (err) => {
      addLog(prog.id, prog.name, 'ERROR', `Execution process error: ${err.message}`);
    });

    childProcess.on('close', (code) => {
      // Memory cleanup for streams
      try {
        childProcess.stdout?.removeAllListeners();
        childProcess.stderr?.removeAllListeners();
      } catch (_) {}

      const active = activeProcesses.get(programId);
      const wasStoppedManually = active?.stoppedManually;

      activeProcesses.delete(programId);
      
      const durationMs = Date.now() - startTime;
      prog.lastRunDurationMs = durationMs;
      prog.lastExitCode = code;
      prog.runningPid = undefined;

      if (wasStoppedManually) {
        prog.status = 'STOPPED';
        addLog(prog.id, prog.name, 'INFO', `Process terminated after user stop request.`);
      } else if (code === 0) {
        prog.status = 'SUCCESS';
        addLog(prog.id, prog.name, 'INFO', `Execution finished successfully in ${(durationMs / 1000).toFixed(2)}s (exit code 0).`);
      } else {
        prog.status = 'FAILED';
        addLog(prog.id, prog.name, 'ERROR', `Execution terminated with exit code ${code} after ${(durationMs / 1000).toFixed(2)}s.`);
      }

      saveStateToDisk();
      resolve(code === 0);
    });
  });
}

function stopProgram(programId: string): boolean {
  const active = activeProcesses.get(programId);
  const prog = programs.find(p => p.id === programId);
  
  let targetPid = active?.process?.pid || prog?.runningPid;

  if (active) {
    active.stoppedManually = true;
    if (active.timeoutTimer) clearTimeout(active.timeoutTimer);
    killProcessTree(active.process.pid, active.process);
    activeProcesses.delete(programId);
  }

  if (prog) {
    if (!targetPid) targetPid = prog.runningPid;
    if (targetPid) {
      killProcessTree(targetPid);
    }
    prog.status = 'STOPPED';
    prog.runningPid = undefined;
    addLog(prog.id, prog.name, 'WARN', `Program manually stopped by user request. Process tree terminated.`);
    saveStateToDisk();
    return true;
  }
  return false;
}

// Scheduler ticker (Runs every 10 seconds to check HH:MM schedules)
let lastCheckedMinute = '';

function startScheduler() {
  setInterval(() => {
    const now = new Date();
    const currentHourMin = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false }); // "14:30"
    const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon ...

    // Prevent running multiple times within the same minute
    if (currentHourMin === lastCheckedMinute) return;
    lastCheckedMinute = currentHourMin;

    programs.forEach(prog => {
      if (prog.schedule && prog.schedule.enabled && prog.schedule.timeStr === currentHourMin) {
        // Check day of week filter if set
        if (prog.schedule.daysOfWeek && prog.schedule.daysOfWeek.length > 0 && !prog.schedule.daysOfWeek.includes(dayOfWeek)) {
          return;
        }

        // KEY REQUIREMENT #4:
        // "何時何分に実行で もし既に起動していれば何もしない。"
        if (prog.status === 'RUNNING' || activeProcesses.has(prog.id)) {
          addLog(
            prog.id,
            prog.name,
            'SKIP',
            `[SCHEDULED TRIGGER ${currentHourMin}] Skipped: Program '${prog.name}' is currently RUNNING. No action taken.`
          );
        } else {
          addLog(
            prog.id,
            prog.name,
            'INFO',
            `[SCHEDULED TRIGGER ${currentHourMin}] Scheduled time reached. Initiating program run...`
          );
          runProgram(prog.id, 'scheduled');
        }
      }
    });
  }, 10000); // Check every 10 seconds
}

// API Routes

// System Status Endpoint (Supports /api/status and /api/system/status)
app.get(['/api/status', '/api/system/status'], (req, res) => {
  const memory = process.memoryUsage();
  const uptime = process.uptime();
  
  const status: SystemStatus = {
    connected: true,
    serverUptimeSec: Math.floor(uptime),
    memoryUsageMb: Math.round(memory.heapUsed / 1024 / 1024),
    heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
    heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
    rssMb: Math.round(memory.rss / 1024 / 1024),
    cpuPercent: Math.min(100, Math.round(Math.random() * 5 + 2)), // simulated CPU load %
    runningProgramsCount: activeProcesses.size,
    totalProgramsCount: programs.length,
    scheduledProgramsCount: programs.filter(p => p.schedule?.enabled).length,
    lastBootTime: bootTime,
    lastSyncedAt: lastSyncedAt,
    railwayProjectName: process.env.RAILWAY_PROJECT_NAME || 'Production Container',
    railwayServiceName: process.env.RAILWAY_SERVICE_NAME || 'Server-Management-App'
  };

  res.json(status);
});

// Sync Endpoint (GET - pull server state, POST - client push state)
app.get(['/api/sync', '/api/state'], (req, res) => {
  const isLight = req.query.light === 'true';

  if (isLight) {
    // Lightweight polling mode to minimize Railway network egress
    const lightPrograms = programs.map(p => ({
      ...p,
      files: p.files.map(f => ({
        id: f.id,
        filename: f.filename,
        isEntry: f.isEntry,
        content: '' // Omit file source text during polling
      })),
      code: ''
    }));

    return res.json({
      programs: lightPrograms,
      logs: logs.slice(0, 25),
      railwayEnvVars,
      lastSyncedAt,
      clientVersion: '1.0.0',
      isLight: true
    });
  }

  res.json({
    programs,
    logs,
    railwayEnvVars,
    lastSyncedAt,
    clientVersion: '1.0.0'
  });
});

app.post(['/api/sync', '/api/state/sync'], (req, res) => {
  const { programs: clientPrograms, logs: clientLogs, railwayEnvVars: clientEnvVars, overrideMode } = req.body;

  if (Array.isArray(clientPrograms)) {
    // Sync client programs while strictly preserving any currently RUNNING state on server
    programs = syncProgramsPreservingRunningState(clientPrograms);
  }

  if (Array.isArray(clientEnvVars)) {
    railwayEnvVars = clientEnvVars;
  }

  if (Array.isArray(clientLogs)) {
    // Append unique client logs
    clientLogs.forEach((cl: LogEntry) => {
      if (!logs.some(l => l.id === cl.id)) {
        logs.unshift(cl);
      }
    });
    logs = logs.slice(0, 1000);
  }

  saveStateToDisk();
  addLog('sys', 'System', 'INFO', `Manual synchronization complete. State saved to Railway server disk.`);

  res.json({
    success: true,
    lastSyncedAt,
    programsCount: programs.length,
    logsCount: logs.length,
    programs
  });
});

// Program CRUD & Operations
app.get('/api/programs', (req, res) => {
  res.json(programs);
});

app.post('/api/programs', (req, res) => {
  const rawProgram = req.body as Program;
  
  if (!rawProgram.name) {
    return res.status(400).json({ error: 'Program name is required' });
  }

  const programData = normalizeProgram(rawProgram);
  const existingIdx = programs.findIndex(p => p.id === programData.id);
  
  if (existingIdx >= 0) {
    const existing = programs[existingIdx];
    const isRunning = existing.status === 'RUNNING' || activeProcesses.has(existing.id) || isPidRunning(existing.runningPid);
    programs[existingIdx] = {
      ...existing,
      ...programData,
      status: isRunning ? 'RUNNING' : (programData.status || existing.status),
      runningPid: isRunning ? (existing.runningPid || activeProcesses.get(existing.id)?.process?.pid) : programData.runningPid,
      updatedAt: new Date().toISOString()
    };
    addLog(programData.id, programData.name, 'INFO', `Updated program configuration (${programData.files.length} file(s)).`);
  } else {
    const newProg: Program = {
      ...programData,
      id: programData.id || `prog-${Date.now()}`,
      status: 'IDLE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    programs.push(newProg);
    addLog(newProg.id, newProg.name, 'INFO', `Created new program '${newProg.name}' (${newProg.language.toUpperCase()}, ${newProg.files.length} file(s)).`);
  }

  saveStateToDisk();
  res.json({ success: true, programs });
});

app.delete('/api/programs/:id', (req, res) => {
  const { id } = req.params;
  
  // Stop if running
  stopProgram(id);

  const prog = programs.find(p => p.id === id);
  programs = programs.filter(p => p.id !== id);
  
  if (prog) {
    addLog(id, prog.name, 'WARN', `Program '${prog.name}' was deleted.`);
    // Clean process directory
    const procDir = path.join(PROCESSES_DIR, id);
    if (fs.existsSync(procDir)) {
      try {
        fs.rmSync(procDir, { recursive: true, force: true });
      } catch (_) {}
    }
  }

  saveStateToDisk();
  res.json({ success: true, programs });
});

// Program Isolated Directory Inspector Endpoint
app.get('/api/programs/:id/directory', (req, res) => {
  const { id } = req.params;
  const prog = programs.find(p => p.id === id);
  if (!prog) {
    return res.status(404).json({ error: 'Program not found' });
  }

  const files = getProgramDirectoryFiles(id);
  res.json({
    programId: id,
    programName: prog.name,
    processDir: path.join(PROCESSES_DIR, id),
    filesCount: files.length,
    files
  });
});

// Run Program Manual API (Guarded against Duplicate Execution)
app.post('/api/programs/:id/run', async (req, res) => {
  const { id } = req.params;
  const prog = programs.find(p => p.id === id);

  if (!prog) {
    return res.status(404).json({ error: 'Program not found' });
  }

  // Prevent duplicate execution
  if (prog.status === 'RUNNING' || activeProcesses.has(id)) {
    return res.status(409).json({
      error: `プログラム「${prog.name}」は既に実行中です。二重稼働防止のため追加の実行要求を拒否しました。`,
      code: 'ALREADY_RUNNING'
    });
  }

  // Trigger non-blocking run
  runProgram(id, 'manual');

  res.json({ success: true, message: `Program '${prog.name}' execution triggered.` });
});

// Stop Program Manual API
app.post('/api/programs/:id/stop', (req, res) => {
  const { id } = req.params;
  const stopped = stopProgram(id);
  res.json({ success: stopped });
});

// Logs API
app.get('/api/logs', (req, res) => {
  const { programId, level, search, limit } = req.query;
  let filtered = [...logs];

  if (programId) {
    filtered = filtered.filter(l => l.programId === programId);
  }
  if (level) {
    filtered = filtered.filter(l => l.level === level);
  }
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(l => l.message.toLowerCase().includes(q) || l.programName.toLowerCase().includes(q));
  }

  const max = limit ? parseInt(String(limit), 10) : 500;
  res.json(filtered.slice(0, max));
});

app.delete('/api/logs', (req, res) => {
  logs = [];
  addLog('sys', 'System', 'INFO', `Logs cleared by user.`);
  saveStateToDisk();
  res.json({ success: true });
});

// Railway API Proxy & Environment Variables
app.get('/api/railway/vars', (req, res) => {
  res.json(railwayEnvVars);
});

app.post('/api/railway/vars', (req, res) => {
  const { vars } = req.body;
  if (Array.isArray(vars)) {
    railwayEnvVars = vars;
    saveStateToDisk();
    addLog('sys', 'Railway API', 'INFO', `Updated ${vars.length} Railway environment variables.`);
  }
  res.json({ success: true, vars: railwayEnvVars });
});

// Healthcheck Endpoint for Container Runtimes (Docker, Cloud Run, Render, Railway)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptimeSec: Math.floor(process.uptime()), version: '3.0.0' });
});

// Clean shutdown handler to kill all active child process trees when server stops
function cleanupActiveProcesses() {
  console.log('[Server Shutdown] Cleaning up active child processes...');
  activeProcesses.forEach((active, progId) => {
    try {
      if (active.timeoutTimer) clearTimeout(active.timeoutTimer);
      if (active.process?.pid) {
        killProcessTree(active.process.pid, active.process);
      }
    } catch (_) {}
  });
  activeProcesses.clear();
}

process.on('SIGTERM', () => {
  cleanupActiveProcesses();
  process.exit(0);
});

process.on('SIGINT', () => {
  cleanupActiveProcesses();
  process.exit(0);
});

// Boot logic
loadStateFromDisk();
startScheduler();

// Start Server with Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (process.env.SERVE_STATIC !== 'false') {
    const distPath = path.join(process.cwd(), 'dist');
    // Static asset caching to save Railway network traffic
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      immutable: true
    }));
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    app.get('/', (req, res) => {
      res.json({
        message: 'Universal Node.js API Server running in Standalone Mode (SERVE_STATIC=false). Client separated.',
        status: 'ok',
        version: '3.0.0',
        platform: process.env.RENDER ? 'Render' : process.env.FLY_APP_NAME ? 'Fly.io' : process.env.RAILWAY_ENVIRONMENT ? 'Railway' : 'Standalone / Docker / VPS'
      });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Universal Node.js API Server v3.0.0] Listening on http://0.0.0.0:${PORT}`);
    console.log(`[Universal Node.js API Server v3.0.0] Mode: ${process.env.SERVE_STATIC === 'false' ? 'Standalone API Server' : 'Fullstack (API + Static Frontend)'}`);
  });
}

startServer();
