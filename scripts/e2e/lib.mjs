import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import net from 'node:net';

export const projectRoot = resolveProjectRoot();
export const unitDir = join(projectRoot, 'unit');
export const portalDir = join(projectRoot, 'portal');
export const resultsRoot = join(projectRoot, 'e2e-results');

const unitRequire = createRequire(join(unitDir, 'package.json'));

function resolveProjectRoot() {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  for (const candidate of [resolve(scriptDir, '../..'), resolve(scriptDir, '../../..')]) {
    if (existsSync(join(candidate, 'unit/package.json')) && existsSync(join(candidate, 'portal/package.json'))) {
      return candidate;
    }
  }
  return resolve(scriptDir, '../..');
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

export function loadEnv() {
  for (const file of [
    '.env',
    '.env.local',
    '.env.production.local',
    'unit/.env',
    'unit/.env.local',
    'portal/.env',
    'portal/.env.local',
    'portal/.env.production.local',
  ]) {
    const path = join(projectRoot, file);
    if (!existsSync(path)) continue;
    const lines = readFileSync(path, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator < 1) continue;
      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^["']|["']$/g, '');
    }
  }
  applyLocalToolchainDefaults();
}

export function env(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function optionalEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

export function ensureDir(path) {
  mkdirSync(path, { recursive: true });
  return path;
}

export function writeJson(path, value) {
  ensureDir(dirname(path));
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function commandExists(command, args = ['--version']) {
  const result = spawnSyncCapture(command, args, { cwd: projectRoot });
  return result.status === 0;
}

export function spawnSyncCapture(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? projectRoot,
    env: { ...process.env, ...(options.env ?? {}) },
    shell: false,
    encoding: 'utf8',
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

export function run(command, args = [], options = {}) {
  return new Promise((resolveRun) => {
    const logPath = options.logPath;
    const child = spawn(command, args, {
      cwd: options.cwd ?? projectRoot,
      env: { ...process.env, ...(options.env ?? {}) },
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    const append = (chunk) => {
      const text = chunk.toString();
      output += text;
      if (options.inherit) process.stdout.write(text);
    };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    child.on('close', (status) => {
      if (logPath) {
        ensureDir(dirname(logPath));
        writeFileSync(logPath, output);
      }
      resolveRun({ status, output });
    });
  });
}

export function spawnLongRunning(command, args = [], options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? projectRoot,
    env: { ...process.env, ...(options.env ?? {}) },
    shell: false,
    stdio: options.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  });
  if (!options.inherit && options.logPath) {
    ensureDir(dirname(options.logPath));
    const chunks = [];
    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stderr.on('data', (chunk) => chunks.push(chunk));
    child.on('close', () => writeFileSync(options.logPath, Buffer.concat(chunks)));
  }
  return child;
}

export function waitForPort(port, host = '127.0.0.1', timeoutMs = 60000) {
  const startedAt = Date.now();
  return new Promise((resolveWait, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ port, host });
      socket.once('connect', () => {
        socket.destroy();
        resolveWait(true);
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}`));
          return;
        }
        setTimeout(attempt, 1000);
      });
    };
    attempt();
  });
}

export function createRunId() {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, 'Z');
  return `e2e_${stamp}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getSupabaseClient() {
  const { createClient } = unitRequire('@supabase/supabase-js');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL is required');
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function applyLocalToolchainDefaults() {
  const androidHome = '/opt/homebrew/share/android-commandlinetools';
  const javaHome = '/opt/homebrew/opt/openjdk@21';
  if (!process.env.ANDROID_HOME && existsSync(androidHome)) {
    process.env.ANDROID_HOME = androidHome;
  }
  if (!process.env.ANDROID_SDK_ROOT && existsSync(androidHome)) {
    process.env.ANDROID_SDK_ROOT = androidHome;
  }
  if (!process.env.JAVA_HOME && existsSync(javaHome)) {
    process.env.JAVA_HOME = javaHome;
  }
  const pathEntries = [
    join(androidHome, 'platform-tools'),
    join(androidHome, 'emulator'),
    join(androidHome, 'cmdline-tools/latest/bin'),
    join(javaHome, 'bin'),
  ].filter((path) => existsSync(path));
  const currentPath = process.env.PATH ?? '';
  const missing = pathEntries.filter((path) => !currentPath.split(':').includes(path));
  if (missing.length > 0) {
    process.env.PATH = `${missing.join(':')}:${currentPath}`;
  }
}

export function assertProductionGuard(target = process.env.E2E_TARGET || 'local') {
  if (target !== 'production') return;
  if (process.env.E2E_ALLOW_PRODUCTION !== '1') {
    throw new Error('Refusing production E2E without E2E_ALLOW_PRODUCTION=1');
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const expected = process.env.E2E_EXPECTED_SUPABASE_URL;
  if (expected && url !== expected) {
    throw new Error(`Supabase URL mismatch. Expected ${expected}, got ${url}`);
  }
}

export function assertRemoteWriteGuard(target = process.env.E2E_TARGET || 'local') {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const isLocalUrl = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/.test(url);
  if (isLocalUrl) return;
  if (target === 'production') {
    assertProductionGuard(target);
    return;
  }
  if (process.env.E2E_ALLOW_REMOTE !== '1') {
    throw new Error(`Refusing remote Supabase writes for target=${target}. Set E2E_TARGET=production E2E_ALLOW_PRODUCTION=1 for production, or E2E_ALLOW_REMOTE=1 for non-production remote test projects.`);
  }
}

export function parseSuiteFlows(suitePath) {
  const content = readFileSync(suitePath, 'utf8');
  const flows = [];
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s*runFlow:\s*(.+?)\s*$/);
    if (!match) continue;
    const raw = match[1].replace(/^["']|["']$/g, '');
    if (!raw.endsWith('.yaml') && !raw.endsWith('.yml')) continue;
    flows.push(resolve(dirname(suitePath), raw));
  }
  return flows;
}
