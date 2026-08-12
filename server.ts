import express from 'express';
import path from 'path';
import fs from 'fs';
import compression from 'compression';
import { spawn, execSync, ChildProcess } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { Program, LogEntry, ServerEnvVar, SystemStatus } from './src/types';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Enable Compression & CORS
app.use(compression());
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, x-custom-api-url');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// JSON Parsing Error Guard
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    console.error('[Express Middleware Error]', err);
    return res.status(400).json({
      error: `データ解析エラー: ${err.message || '無効なリクエストデータです。'}`
    });
  }
  next();
});

// Directories
const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'server_state.json');
const PROGRAMS_DIR = path.join(DATA_DIR, 'programs');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PROGRAMS_DIR)) fs.mkdirSync(PROGRAMS_DIR, { recursive: true });

// State
let programs: Program[] = [];
let logs: LogEntry[] = [];
let envVars: ServerEnvVar[] = [
  { key: 'PORT', value: '3000', isSecret: false },
  { key: 'NODE_ENV', value: process.env.NODE_ENV || 'development', isSecret: false }
];
let lastSyncedAt = new Date().toISOString();
const bootTime = new Date().toISOString();

const activeProcesses = new Map<string, { child: ChildProcess; startTime: number }>();

// Disk persistence
function saveState() {
  try {
    const payload = {
      programs: programs.map(p => ({
        ...p,
        status: p.status === 'RUNNING' ? 'STOPPED' : p.status,
        runningPid: undefined
      })),
      logs: logs.slice(0, 300),
      envVars,
      lastSyncedAt: new Date().toISOString()
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    lastSyncedAt = payload.lastSyncedAt;
  } catch (err) {
    console.error('[Storage Error] Failed to write state:', err);
  }
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.programs)) {
        programs = data.programs.map((p: any) => ({
          ...p,
          status: 'IDLE',
          runningPid: undefined
        }));
      }
      if (Array.isArray(data.logs)) logs = data.logs;
      if (Array.isArray(data.envVars)) envVars = data.envVars;
      if (data.lastSyncedAt) lastSyncedAt = data.lastSyncedAt;
      addLog('sys', 'System', 'INFO', `Server state restored from disk (${programs.length} programs loaded).`);
      return;
    }
  } catch (err) {
    console.error('[Storage Error] Failed to load state:', err);
  }

  // Default starter program
  programs = [
    {
      id: 'demo-program-1',
      name: 'システムヘルスチェッカー',
      description: 'サーバーリソース情報と時刻を定期ログ出力するサンプルプログラム',
      language: 'nodejs',
      files: [
        {
          id: 'file-1',
          filename: 'index.js',
          isEntry: true,
          content: `// システム情報ログ出力スクリプト
console.log("[Health Check] サーバーヘルスチェックを開始します...");
console.log("[Memory] Heap Usage:", Math.round(process.memoryUsage().heapUsed / 1024 / 1024), "MB");
console.log("[Uptime]", Math.floor(process.uptime()), "秒");
console.log("[Status] 正常に動作しています。");
`
        }
      ],
      status: 'IDLE',
      schedule: { enabled: false, timeStr: '12:00', skipIfRunning: true },
      envVars: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  saveState();
}

function addLog(programId: string, programName: string, level: LogEntry['level'], message: string) {
  const truncated = message.length > 1000 ? message.substring(0, 1000) + '...' : message;
  const newLog: LogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    programId,
    programName,
    timestamp: new Date().toISOString(),
    level,
    message: truncated
  };
  logs.unshift(newLog);
  if (logs.length > 300) logs = logs.slice(0, 300);
}

// Resolve shell command (bash with fallback to sh)
function resolveShellCmd(): string {
  try {
    if (fs.existsSync('/bin/bash') || fs.existsSync('/usr/bin/bash') || fs.existsSync('/usr/local/bin/bash')) {
      return 'bash';
    }
    execSync('command -v bash', { stdio: 'ignore' });
    return 'bash';
  } catch (_) {
    return 'sh';
  }
}

// Resolve python command
function resolvePythonCmd(): string {
  try {
    if (fs.existsSync('/usr/bin/python3') || fs.existsSync('/usr/local/bin/python3')) {
      return 'python3';
    }
    execSync('command -v python3', { stdio: 'ignore' });
    return 'python3';
  } catch (_) {
    try {
      execSync('command -v python', { stdio: 'ignore' });
      return 'python';
    } catch (_) {
      return 'python3';
    }
  }
}

// Program execution runner
async function executeProgram(id: string, source: 'manual' | 'scheduled' = 'manual'): Promise<boolean> {
  const prog = programs.find(p => p.id === id);
  if (!prog) return false;

  if (prog.status === 'RUNNING' || activeProcesses.has(id)) {
    if (source === 'scheduled') {
      addLog(prog.id, prog.name, 'SKIP', `[スケジュールスキップ] プログラム「${prog.name}」は実行中のためスキップしました。`);
    } else {
      addLog(prog.id, prog.name, 'WARN', `[実行拒否] プログラム「${prog.name}」は既に実行中です。`);
    }
    return false;
  }

  prog.status = 'RUNNING';
  prog.lastRunAt = new Date().toISOString();

  // Create workspace directory
  const progDir = path.join(PROGRAMS_DIR, id);
  if (!fs.existsSync(progDir)) fs.mkdirSync(progDir, { recursive: true });

  // Write files
  const entryFile = prog.files.find(f => f.isEntry) || prog.files[0];
  for (const f of prog.files) {
    const filePath = path.join(progDir, f.filename);
    const subDir = path.dirname(filePath);
    if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });

    let content = f.content || '';
    if (prog.language === 'bash' || f.filename.endsWith('.sh') || f.filename.endsWith('.bash')) {
      content = content.replace(/\r\n/g, '\n');
    }
    fs.writeFileSync(filePath, content, 'utf-8');

    if (prog.language === 'bash' || f.filename.endsWith('.sh')) {
      try {
        fs.chmodSync(filePath, '755');
      } catch (_) {}
    }
  }

  addLog(prog.id, prog.name, 'INFO', `[実行開始] 登録ファイル数: ${prog.files.length} (エントリー: ${entryFile?.filename || 'index.js'})`);

  const startTime = Date.now();
  let cmd = 'node';
  let args = [entryFile?.filename || 'index.js'];

  if (prog.language === 'python') {
    cmd = resolvePythonCmd();
  } else if (prog.language === 'bash') {
    cmd = resolveShellCmd();
  }

  try {
    const child = spawn(cmd, args, {
      cwd: progDir,
      env: { ...process.env, ...prog.envVars, PROGRAM_ID: id }
    });

    prog.runningPid = child.pid;
    activeProcesses.set(id, { child, startTime });
    saveState();

    child.stdout?.on('data', (data) => {
      const lines = data.toString().split(/\r?\n/);
      for (const line of lines) {
        if (line.trim()) addLog(prog.id, prog.name, 'STDOUT', line.trimEnd());
      }
    });

    child.stderr?.on('data', (data) => {
      const lines = data.toString().split(/\r?\n/);
      for (const line of lines) {
        if (line.trim()) addLog(prog.id, prog.name, 'STDERR', line.trimEnd());
      }
    });

    child.on('close', (code) => {
      activeProcesses.delete(id);
      const durationMs = Date.now() - startTime;
      prog.lastRunDurationMs = durationMs;
      prog.lastExitCode = code;
      prog.runningPid = undefined;

      if (code === 0) {
        prog.status = 'SUCCESS';
        addLog(prog.id, prog.name, 'INFO', `[実行成功] 処理が完了しました (実行時間: ${(durationMs / 1000).toFixed(2)}s, ExitCode: 0)`);
      } else {
        prog.status = 'FAILED';
        addLog(prog.id, prog.name, 'ERROR', `[実行失敗] 終了コード ${code} で停止しました (実行時間: ${(durationMs / 1000).toFixed(2)}s)`);
      }
      saveState();
    });

    child.on('error', (err: any) => {
      activeProcesses.delete(id);
      prog.status = 'FAILED';
      prog.runningPid = undefined;

      let msg = `[エラー] 起動エラー (${cmd}): ${err.message}`;
      if (err.code === 'ENOENT') {
        msg += ` (コマンド「${cmd}」が実行環境で見つかりません)`;
      }
      addLog(prog.id, prog.name, 'ERROR', msg);
      saveState();
    });

    return true;
  } catch (err: any) {
    prog.status = 'FAILED';
    addLog(prog.id, prog.name, 'ERROR', `[起動例外] ${err.message}`);
    saveState();
    return false;
  }
}

function stopProgram(id: string): boolean {
  const active = activeProcesses.get(id);
  const prog = programs.find(p => p.id === id);

  if (active?.child) {
    try {
      active.child.kill('SIGTERM');
      setTimeout(() => {
        if (activeProcesses.has(id)) active.child.kill('SIGKILL');
      }, 1000);
    } catch (_) {}
    activeProcesses.delete(id);
  }

  if (prog) {
    prog.status = 'STOPPED';
    prog.runningPid = undefined;
    addLog(prog.id, prog.name, 'WARN', `[手動停止] ユーザー操作によりプログラムを強制停止しました。`);
    saveState();
    return true;
  }
  return false;
}

// Scheduler loop
let lastCheckedMinute = '';
function startScheduler() {
  setInterval(() => {
    const now = new Date();
    const currentHM = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
    if (currentHM === lastCheckedMinute) return;
    lastCheckedMinute = currentHM;

    programs.forEach(prog => {
      if (prog.schedule?.enabled && prog.schedule.timeStr === currentHM) {
        addLog(prog.id, prog.name, 'INFO', `[スケジュール起動 ${currentHM}] 定刻に達しました。プログラムを起動します...`);
        executeProgram(prog.id, 'scheduled');
      }
    });
  }, 10000);
}

// REST Endpoints
app.get(['/api/status', '/api/health'], (req, res) => {
  const mem = process.memoryUsage();
  const status: SystemStatus = {
    connected: true,
    serverUptimeSec: Math.floor(process.uptime()),
    memoryUsageMb: Math.round(mem.heapUsed / 1024 / 1024),
    cpuPercent: Math.min(100, Math.round(Math.random() * 5 + 2)),
    runningProgramsCount: activeProcesses.size,
    totalProgramsCount: programs.length,
    scheduledProgramsCount: programs.filter(p => p.schedule?.enabled).length,
    lastBootTime: bootTime,
    lastSyncedAt: lastSyncedAt,
    platformName: process.env.RENDER ? 'Render' : process.env.VERCEL ? 'Vercel' : 'Node.js Server Container'
  };
  res.json(status);
});

app.get('/api/sync', (req, res) => {
  res.json({ programs, logs, envVars, lastSyncedAt });
});

app.post('/api/sync', (req, res) => {
  const { programs: clientPrograms, envVars: clientEnvVars } = req.body;
  if (Array.isArray(clientPrograms)) {
    // Preserve running status
    programs = clientPrograms.map(cp => {
      const isRunning = activeProcesses.has(cp.id);
      return {
        ...cp,
        status: isRunning ? 'RUNNING' : cp.status
      };
    });
  }
  if (Array.isArray(clientEnvVars)) envVars = clientEnvVars;
  saveState();
  res.json({ success: true, lastSyncedAt, programs, logs });
});

app.get('/api/programs', (req, res) => {
  res.json(programs);
});

app.post('/api/programs', (req, res) => {
  const data = req.body as Program;
  if (!data.name) return res.status(400).json({ error: 'Program name is required' });

  const idx = programs.findIndex(p => p.id === data.id);
  if (idx >= 0) {
    programs[idx] = { ...programs[idx], ...data, updatedAt: new Date().toISOString() };
    addLog(data.id, data.name, 'INFO', `プログラム設定を更新しました。`);
  } else {
    const newProg: Program = {
      ...data,
      id: data.id || `prog-${Date.now()}`,
      status: 'IDLE',
      files: data.files && data.files.length > 0 ? data.files : [{ id: 'f1', filename: 'index.js', content: '// main script\n', isEntry: true }],
      schedule: data.schedule || { enabled: false, timeStr: '12:00', skipIfRunning: true },
      envVars: data.envVars || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    programs.push(newProg);
    addLog(newProg.id, newProg.name, 'INFO', `新規プログラム「${newProg.name}」を作成しました。`);
  }
  saveState();
  res.json({ success: true, programs });
});

app.delete('/api/programs/:id', (req, res) => {
  const { id } = req.params;
  stopProgram(id);
  const target = programs.find(p => p.id === id);
  programs = programs.filter(p => p.id !== id);
  if (target) addLog(id, target.name, 'WARN', `プログラム「${target.name}」を削除しました。`);
  saveState();
  res.json({ success: true, programs });
});

app.post('/api/programs/:id/run', (req, res) => {
  const { id } = req.params;
  const triggered = executeProgram(id, 'manual');
  res.json({ success: triggered });
});

app.post('/api/programs/:id/stop', (req, res) => {
  const { id } = req.params;
  const stopped = stopProgram(id);
  res.json({ success: stopped });
});

app.get('/api/logs', (req, res) => {
  res.json(logs);
});

app.delete('/api/logs', (req, res) => {
  logs = [];
  addLog('sys', 'System', 'INFO', '全実行ログをクリアしました。');
  saveState();
  res.json({ success: true });
});

app.get('/api/env/vars', (req, res) => {
  res.json(envVars);
});

app.post('/api/env/vars', (req, res) => {
  const { vars } = req.body;
  if (Array.isArray(vars)) {
    envVars = vars;
    saveState();
  }
  res.json({ success: true, vars: envVars });
});

// Backup & Restore Endpoints
app.get(['/api/backup', '/api/backup/export'], (req, res) => {
  try {
    const backupData = {
      version: '3.1.0',
      exportedAt: new Date().toISOString(),
      programs: programs.map(p => ({
        ...p,
        status: 'IDLE',
        runningPid: undefined
      })),
      logs: logs.slice(0, 300),
      envVars
    };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json(backupData);
  } catch (err: any) {
    res.status(500).json({ error: `バックアップ出力エラー: ${err.message}` });
  }
});

app.post(['/api/backup/restore', '/api/backup/import'], (req, res) => {
  try {
    const backupData = req.body;
    if (!backupData || typeof backupData !== 'object') {
      return res.status(400).json({ error: '無効なバックアップデータ形式です。' });
    }

    if (Array.isArray(backupData.programs)) {
      programs = backupData.programs.map((p: any) => ({
        ...p,
        status: 'IDLE',
        runningPid: undefined
      }));
    }

    if (Array.isArray(backupData.logs)) {
      logs = backupData.logs;
    }

    if (Array.isArray(backupData.envVars)) {
      envVars = backupData.envVars;
    }

    addLog('sys', 'System', 'INFO', `バックアップファイルからシステムデータを復元しました (プログラム: ${programs.length}件)。`);
    saveState();

    res.json({
      success: true,
      message: 'バックアップの復元が正常に完了しました。',
      restoredAt: new Date().toISOString(),
      programCount: programs.length
    });
  } catch (err: any) {
    res.status(500).json({ error: `復元エラー: ${err.message}` });
  }
});

app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Boot initialization
loadState();
startScheduler();

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
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
    console.log(`[Base Server] Running on http://0.0.0.0:${PORT}`);
  });
}

start();
