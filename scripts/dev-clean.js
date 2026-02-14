#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const isWindows = process.platform === 'win32';
const cwd = process.cwd();
const lockPath = path.join(cwd, '.next', 'dev', 'lock');
const dryRun = process.argv.includes('--dry-run');

function log(message) {
  process.stdout.write(`${message}\n`);
}

function warn(message) {
  process.stderr.write(`${message}\n`);
}

function listDevPidsWindows() {
  const escapedCwd = cwd.replace(/'/g, "''");
  const psScript = `
$cwd = '${escapedCwd}';
Get-CimInstance Win32_Process |
Where-Object {
  $_.Name -eq 'node.exe' -and
  $_.CommandLine -like '*next*dev*' -and
  $_.CommandLine -like ('*' + $cwd + '*')
} |
Select-Object -ExpandProperty ProcessId
`;

  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-Command', psScript],
    { encoding: 'utf8' }
  );

  if (result.error) {
    warn(`[dev:clean] Failed to query process list: ${result.error.message}`);
    return [];
  }

  return (result.stdout || '')
    .split(/\r?\n/)
    .map((line) => Number.parseInt(line.trim(), 10))
    .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
}

function listDevPidsUnix() {
  const result = spawnSync('ps', ['-ax', '-o', 'pid=', '-o', 'command='], {
    encoding: 'utf8'
  });

  if (result.error) {
    warn(`[dev:clean] Failed to query process list: ${result.error.message}`);
    return [];
  }

  return (result.stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const firstSpace = line.indexOf(' ');
      if (firstSpace <= 0) return null;
      const pid = Number.parseInt(line.slice(0, firstSpace), 10);
      const command = line.slice(firstSpace + 1);
      return { pid, command };
    })
    .filter((entry) => entry && Number.isInteger(entry.pid) && entry.pid > 0 && entry.pid !== process.pid)
    .filter((entry) => entry.command.includes('next dev') && entry.command.includes(cwd))
    .map((entry) => entry.pid);
}

function listDevPids() {
  return isWindows ? listDevPidsWindows() : listDevPidsUnix();
}

function killPid(pid) {
  if (dryRun) {
    log(`[dev:clean] [dry-run] Would kill PID ${pid}`);
    return;
  }

  if (isWindows) {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch (error) {
    warn(`[dev:clean] Failed to kill PID ${pid}: ${error.message}`);
  }
}

function removeLockFile() {
  if (!fs.existsSync(lockPath)) {
    log('[dev:clean] Lock file not found.');
    return;
  }

  if (dryRun) {
    log(`[dev:clean] [dry-run] Would remove ${lockPath}`);
    return;
  }

  try {
    fs.unlinkSync(lockPath);
    log(`[dev:clean] Removed lock file: ${lockPath}`);
  } catch (error) {
    warn(`[dev:clean] Failed to remove lock file: ${error.message}`);
  }
}

function startDevServer() {
  if (dryRun) {
    log('[dev:clean] [dry-run] Would start: next dev');
    return;
  }

  const nextBin = path.join(
    cwd,
    'node_modules',
    '.bin',
    isWindows ? 'next.cmd' : 'next'
  );

  if (!fs.existsSync(nextBin)) {
    warn('[dev:clean] next binary not found. Please run npm install first.');
    process.exit(1);
  }

  log('[dev:clean] Starting next dev...');
  const child = spawn(nextBin, ['dev'], {
    cwd,
    env: process.env,
    stdio: 'inherit'
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });

  child.on('error', (error) => {
    warn(`[dev:clean] Failed to start next dev: ${error.message}`);
    process.exit(1);
  });
}

function main() {
  const pids = Array.from(new Set(listDevPids()));
  if (pids.length) {
    log(`[dev:clean] Found ${pids.length} stale next dev process(es): ${pids.join(', ')}`);
    pids.forEach(killPid);
  } else {
    log('[dev:clean] No stale next dev process found.');
  }

  removeLockFile();
  startDevServer();
}

main();

