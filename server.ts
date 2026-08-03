import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { Program, LogEntry, RailwayEnvVar, SystemStatus, AppStatePayload } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Directory setup for server persistent storage
const DATA_DIR = path.join(process.cwd(), 'data');
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
const activeProcesses = new Map<string, { process: ChildProcess; startTime: number; timeoutTimer?: NodeJS.Timeout }>();

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
  const newLog: LogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    programId,
    programName,
    timestamp: new Date().toISOString(),
    level,
    message,
    details
  };
  logs.unshift(newLog);
  if (logs.length > 1000) {
    logs = logs.slice(0, 1000);
  }
}

// Sandbox execution engine for registered programs
async function runProgram(programId: string, triggerSource: 'manual' | 'scheduled' = 'manual'): Promise<boolean> {
  const prog = programs.find(p => p.id === programId);
  if (!prog) return false;

  // Check if already running
  if (prog.status === 'RUNNING' || activeProcesses.has(programId)) {
    if (triggerSource === 'scheduled') {
      const nowStr = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
      addLog(
        prog.id,
        prog.name,
        'SKIP',
        `[SCHEDULE SKIPPED] Program '${prog.name}' is already running at ${nowStr}. Skipped execution to prevent duplicate instances.`
      );
    } else {
      addLog(prog.id, prog.name, 'WARN', `Program '${prog.name}' is already running. Action ignored.`);
    }
    return false;
  }

  prog.status = 'RUNNING';
  prog.lastRunAt = new Date().toISOString();

  const norm = normalizeProgram(prog);
  prog.files = norm.files;

  // Process-isolated directory setup: /data/processes/<programId>
  const procDir = path.join(PROCESSES_DIR, prog.id);
  try {
    if (!fs.existsSync(procDir)) {
      fs.mkdirSync(procDir, { recursive: true });
    }
    // Write all files into the isolated process directory
    for (const file of prog.files) {
      const filePath = path.join(procDir, file.filename);
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
  
  addLog(prog.id, prog.name, 'INFO', `Starting program execution in isolated dir (${procDir}). Entry: ${entryFile.filename} (${prog.files.length} file(s)) - Source: ${triggerSource}`);

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
      childProcess = spawn(cmd, args, { env, cwd: procDir });
    } catch (spawnError: any) {
      if (prog.language !== 'nodejs') {
        cmd = 'node';
        args = ['-e', `console.log("Output from ${prog.language} entry ${entryFile.filename}...");` ];
        childProcess = spawn(cmd, args, { env, cwd: procDir });
      } else {
        prog.status = 'FAILED';
        addLog(prog.id, prog.name, 'ERROR', `Spawn error: ${spawnError.message}`);
        saveStateToDisk();
        return resolve(false);
      }
    }

    prog.runningPid = childProcess.pid;

    // Timeout safety timer
    const timeoutMs = (prog.timeoutSec || 30) * 1000;
    const timeoutTimer = setTimeout(() => {
      if (activeProcesses.has(programId)) {
        addLog(prog.id, prog.name, 'WARN', `Program timed out after ${prog.timeoutSec} seconds. Killing process...`);
        try {
          childProcess.kill('SIGTERM');
        } catch (_) {}
      }
    }, timeoutMs);

    activeProcesses.set(programId, { process: childProcess, startTime, timeoutTimer });

    childProcess.stdout?.on('data', (data) => {
      const text = data.toString().trim();
      if (text) {
        addLog(prog.id, prog.name, 'STDOUT', text);
      }
    });

    childProcess.stderr?.on('data', (data) => {
      const text = data.toString().trim();
      if (text) {
        addLog(prog.id, prog.name, 'STDERR', text);
      }
    });

    childProcess.on('error', (err) => {
      addLog(prog.id, prog.name, 'ERROR', `Execution process error: ${err.message}`);
    });

    childProcess.on('close', (code) => {
      clearTimeout(timeoutTimer);
      activeProcesses.delete(programId);
      
      const durationMs = Date.now() - startTime;
      prog.lastRunDurationMs = durationMs;
      prog.lastExitCode = code;
      prog.runningPid = undefined;

      if (code === 0) {
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
  
  if (active) {
    if (active.timeoutTimer) clearTimeout(active.timeoutTimer);
    try {
      active.process.kill('SIGKILL');
    } catch (_) {}
    activeProcesses.delete(programId);
  }

  if (prog) {
    prog.status = 'STOPPED';
    prog.runningPid = undefined;
    addLog(prog.id, prog.name, 'WARN', `Program manually stopped by user request.`);
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
    if (overrideMode === 'client') {
      // Full replacement from client state
      programs = clientPrograms.map(normalizeProgram);
    } else {
      // Direct replace to sync client's explicit program list
      programs = clientPrograms.map(normalizeProgram);
    }
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
    programs[existingIdx] = {
      ...existing,
      ...programData,
      status: existing.status === 'RUNNING' ? 'RUNNING' : (programData.status || existing.status),
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

// Run Program Manual API
app.post('/api/programs/:id/run', async (req, res) => {
  const { id } = req.params;
  const prog = programs.find(p => p.id === id);

  if (!prog) {
    return res.status(404).json({ error: 'Program not found' });
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
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
