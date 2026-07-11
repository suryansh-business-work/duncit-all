/**
 * Rich health report for `GET /health`.
 *
 * Kept lightweight (no async I/O) so the Docker healthcheck + the public status
 * page can poll it cheaply. Returns HTTP 200 whenever the process is up; the
 * `status`/`checks` fields convey dependency health (e.g. a transient DB blip)
 * without flapping the container's health state.
 *
 * Exposes only operational info (versions, uptime, process memory, DB state) —
 * sensitive host detail (disk, IPs, Docker) lives behind the role-gated Tech
 * portal, not this public endpoint.
 */
import os from 'node:os';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';

const READY_STATE: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
      version?: string;
    };
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

const VERSION = readVersion();

export interface HealthReport {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  environment: string;
  node: string;
  platform: string;
  hostname: string;
  timestamp: string;
  uptime: { processSeconds: number; systemSeconds: number };
  memory: {
    rssBytes: number;
    heapUsedBytes: number;
    heapTotalBytes: number;
    systemTotalBytes: number;
    systemFreeBytes: number;
  };
  checks: { database: string };
}

export function buildHealth(): HealthReport {
  const mem = process.memoryUsage();
  const database = READY_STATE[mongoose.connection.readyState] ?? 'unknown';
  return {
    status: database === 'connected' ? 'ok' : 'degraded',
    service: 'duncit-server',
    version: VERSION,
    environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development',
    node: process.version,
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
    hostname: os.hostname(),
    timestamp: new Date().toISOString(),
    uptime: { processSeconds: Math.round(process.uptime()), systemSeconds: Math.round(os.uptime()) },
    memory: {
      rssBytes: mem.rss,
      heapUsedBytes: mem.heapUsed,
      heapTotalBytes: mem.heapTotal,
      systemTotalBytes: os.totalmem(),
      systemFreeBytes: os.freemem(),
    },
    checks: { database },
  };
}
