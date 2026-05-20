#!/usr/bin/env node
/**
 * Kill any process holding the duncit dev-server ports.
 *
 * Used by `pnpm kill-ports:all` to free ports before `pnpm run:all`.
 *
 * Default ports (match vite/astro/ts-node-dev configs):
 *   2000 → website (astro)
 *   2001 → server (graphql)
 *   2002 → admin (vite)
 *   2003 → mweb-app (vite)
 *
 * Override with: `node scripts/kill-ports.mjs 5173 5174 ...`
 */
import { execSync, spawnSync } from 'node:child_process';
import process from 'node:process';

const DEFAULT_PORTS = [2000, 2001, 2002, 2003];
const argPorts = process.argv
  .slice(2)
  .map((value) => Number(value))
  .filter((value) => Number.isInteger(value) && value > 0);
const ports = argPorts.length > 0 ? argPorts : DEFAULT_PORTS;

const isWindows = process.platform === 'win32';

function killWindows(port) {
  // netstat -> pid list -> taskkill /F /PID <pid>
  let pids = [];
  try {
    const stdout = execSync(`netstat -ano -p tcp | findstr ":${port}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    pids = Array.from(
      new Set(
        stdout
          .split(/\r?\n/)
          .map((line) => {
            const match = line.match(/\s+(\d+)\s*$/);
            return match ? match[1] : null;
          })
          .filter((pid) => pid && pid !== '0'),
      ),
    );
  } catch {
    // No matches → nothing to do.
  }
  if (pids.length === 0) {
    return { port, killed: 0 };
  }
  let killed = 0;
  for (const pid of pids) {
    const res = spawnSync('taskkill', ['/F', '/PID', pid], { stdio: 'ignore' });
    if (res.status === 0) killed += 1;
  }
  return { port, killed };
}

function killPosix(port) {
  try {
    const stdout = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const pids = stdout
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (pids.length === 0) return { port, killed: 0 };
    let killed = 0;
    for (const pid of pids) {
      const res = spawnSync('kill', ['-9', pid], { stdio: 'ignore' });
      if (res.status === 0) killed += 1;
    }
    return { port, killed };
  } catch {
    return { port, killed: 0 };
  }
}

const killer = isWindows ? killWindows : killPosix;

let totalKilled = 0;
for (const port of ports) {
  const { killed } = killer(port);
  totalKilled += killed;
  if (killed > 0) {
    console.log(`✓ port ${port} — freed ${killed} process${killed === 1 ? '' : 'es'}`);
  } else {
    console.log(`· port ${port} — already free`);
  }
}

if (totalKilled === 0) {
  console.log('All dev-server ports are already free.');
} else {
  console.log(`Done. Killed ${totalKilled} process${totalKilled === 1 ? '' : 'es'} total.`);
}
