/**
 * Tech-portal "Server" data: host system metrics (OS, CPU, memory, disk,
 * network, SSH, SSL) and Docker container status — all gathered live from the
 * machine the API runs on. Built on Node core only (os / fs / http); Docker is
 * read over its unix socket when mounted (graceful "unavailable" otherwise).
 */
import os from 'node:os';
import { statfs, readFile } from 'node:fs/promises';
import http from 'node:http';
import { exec } from 'node:child_process';
import { logs } from '@observability/log';
import type { AuthUser } from '@context';
import { probe, isAllowedHost } from '../../../observability/statusProbe';
import {
  applyTableQueryInMemory,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';

const DOCKER_SOCKET = process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock';
const DOCKER_TIMEOUT_MS = 4000;
// A restart runs the container's stop-timeout (default 10s) before starting.
const DOCKER_RESTART_TIMEOUT_MS = 30_000;
const EXEC_TIMEOUT_MS = 30_000;
const EXEC_MAX_BUFFER = 1024 * 1024; // 1 MB hard cap from the child process
const OUTPUT_CAP = 64 * 1024; // 64 KB returned to the UI
const LOG_TAIL_DEFAULT = 200;
const LOG_TAIL_MAX = 1000;
const DISTRO_LABEL: Record<string, string> = { linux: 'Linux', win32: 'Windows', darwin: 'macOS' };

export interface TechOsInfo {
  platform: string;
  distro: string;
  type: string;
  release: string;
  arch: string;
  hostname: string;
  kernelUptimeSeconds: number;
  processUptimeSeconds: number;
  nodeVersion: string;
}
export interface TechCpuInfo {
  model: string;
  cores: number;
  speedMhz: number;
  loadAvg1: number;
  loadAvg5: number;
  loadAvg15: number;
  usagePercent: number;
}
export interface TechBytesInfo {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usagePercent: number;
}
export interface TechDiskInfo extends TechBytesInfo {
  path: string;
}
export interface TechNetworkInterface {
  name: string;
  address: string;
  family: string;
  internal: boolean;
}
export interface TechSslInfo {
  host: string;
  valid: boolean;
  issuer: string | null;
  subject: string | null;
  validFrom: string | null;
  validTo: string | null;
  daysRemaining: number | null;
  protocol: string | null;
  error: string | null;
}
export interface TechServerInfo {
  os: TechOsInfo;
  cpu: TechCpuInfo;
  memory: TechBytesInfo;
  disk: TechDiskInfo;
  network: TechNetworkInterface[];
  sshPort: number;
  ssl: TechSslInfo | null;
  collectedAt: string;
}
export interface TechDockerContainer {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  createdAt: string | null;
}
export interface TechDockerInfo {
  available: boolean;
  version: string | null;
  error: string | null;
  containersRunning: number;
  containersTotal: number;
  containers: TechDockerContainer[];
}

function pct(used: number, total: number): number {
  return total > 0 ? Math.round((used / total) * 100) : 0;
}

function cpuTotals(): { idle: number; total: number } {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    for (const t of Object.values(cpu.times)) total += t;
    idle += cpu.times.idle;
  }
  return { idle, total };
}

/** Real CPU usage from two snapshots 100ms apart (cross-platform). */
async function cpuUsagePercent(): Promise<number> {
  const a = cpuTotals();
  await new Promise((r) => setTimeout(r, 100));
  const b = cpuTotals();
  const idle = b.idle - a.idle;
  const total = b.total - a.total;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((1 - idle / total) * 100)));
}

function buildCpu(usagePercent: number): TechCpuInfo {
  const cpus = os.cpus();
  const [l1 = 0, l5 = 0, l15 = 0] = os.loadavg();
  return {
    model: cpus[0]?.model.trim() ?? 'Unknown',
    cores: cpus.length,
    speedMhz: cpus[0]?.speed ?? 0,
    loadAvg1: Number(l1.toFixed(2)),
    loadAvg5: Number(l5.toFixed(2)),
    loadAvg15: Number(l15.toFixed(2)),
    usagePercent,
  };
}

function buildOs(): TechOsInfo {
  return {
    platform: os.platform(),
    distro: DISTRO_LABEL[os.platform()] ?? os.platform(),
    type: os.type(),
    release: os.release(),
    arch: os.arch(),
    hostname: os.hostname(),
    kernelUptimeSeconds: Math.round(os.uptime()),
    processUptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
  };
}

function buildMemory(): TechBytesInfo {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return { totalBytes: total, freeBytes: free, usedBytes: used, usagePercent: pct(used, total) };
}

async function buildDisk(): Promise<TechDiskInfo> {
  const path = os.platform() === 'win32' ? `${process.cwd().split(/[\\/]/)[0]}\\` : '/';
  try {
    const s = await statfs(path);
    const total = s.blocks * s.bsize;
    const free = s.bfree * s.bsize;
    const used = total - free;
    return {
      path,
      totalBytes: total,
      freeBytes: free,
      usedBytes: used,
      usagePercent: pct(used, total),
    };
  } catch {
    return { path, totalBytes: 0, freeBytes: 0, usedBytes: 0, usagePercent: 0 };
  }
}

function buildNetwork(): TechNetworkInterface[] {
  const out: TechNetworkInterface[] = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      out.push({ name, address: a.address, family: String(a.family), internal: a.internal });
    }
  }
  return out;
}

async function detectSshPort(): Promise<number> {
  try {
    const text = await readFile('/etc/ssh/sshd_config', 'utf8');
    const line = text
      .split('\n')
      .map((l) => l.trim())
      .find((l) => /^Port\s+\d+/i.test(l));
    if (line) return Number(line.split(/\s+/)[1]);
  } catch {
    /* file not present (e.g. inside a container) — fall through to default */
  }
  return 22;
}

async function buildSsl(host: string | undefined): Promise<TechSslInfo | null> {
  if (!host || !isAllowedHost(host)) return null;
  const result = await probe(new URL(`https://${host}`));
  const ssl = result.ssl;
  return {
    host,
    valid: ssl?.authorized ?? false,
    issuer: ssl?.issuer ?? null,
    subject: ssl?.subject ?? null,
    validFrom: ssl?.validFrom ?? null,
    validTo: ssl?.validTo ?? null,
    daysRemaining: ssl?.daysRemaining ?? null,
    protocol: ssl?.protocol ?? null,
    error: result.error ?? null,
  };
}

function dockerGet<T>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { socketPath: DOCKER_SOCKET, path, method: 'GET', timeout: DOCKER_TIMEOUT_MS },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if ((res.statusCode ?? 500) >= 400) {
            reject(new Error(`Docker API responded ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(body) as T);
          } catch {
            reject(new Error('Invalid Docker API response'));
          }
        });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Docker API timed out'));
    });
    req.on('error', reject);
    req.end();
  });
}

/** GET a raw (unparsed) Docker response body — used for the log stream, which is
 * a byte stream (framed), not JSON. */
function dockerGetRaw(path: string, timeoutMs = DOCKER_TIMEOUT_MS): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { socketPath: DOCKER_SOCKET, path, method: 'GET', timeout: timeoutMs },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          if ((res.statusCode ?? 500) >= 400) {
            reject(new Error(`Docker API responded ${res.statusCode}`));
            return;
          }
          resolve(Buffer.concat(chunks));
        });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Docker API timed out'));
    });
    req.on('error', reject);
    req.end();
  });
}

/** POST to the Docker API (e.g. restart) — resolves on any 2xx, rejects with the
 * status/body otherwise. */
function dockerPost(path: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { socketPath: DOCKER_SOCKET, path, method: 'POST', timeout: timeoutMs },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          const code = res.statusCode ?? 500;
          if (code >= 200 && code < 300) {
            resolve();
            return;
          }
          reject(new Error(`Docker API responded ${code}${body ? `: ${body.trim()}` : ''}`));
        });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Docker API timed out'));
    });
    req.on('error', reject);
    req.end();
  });
}

/** Docker's non-TTY log stream frames each chunk as [type,0,0,0,len(4 BE)] +
 * payload; TTY containers stream raw text. Strip the frame headers, falling back
 * to raw text when the bytes aren't framed. */
function demuxDockerLogs(buf: Buffer): string {
  let out = '';
  let i = 0;
  while (i + 8 <= buf.length) {
    const type = buf[i];
    if (type <= 2 && buf[i + 1] === 0 && buf[i + 2] === 0 && buf[i + 3] === 0) {
      const len = buf.readUInt32BE(i + 4);
      out += buf.toString('utf8', i + 8, i + 8 + len);
      i += 8 + len;
    } else {
      return buf.toString('utf8');
    }
  }
  return out || buf.toString('utf8');
}

/** Truncate large command/log output so a runaway command can't flood the API. */
function capOutput(text: string): string {
  return text.length > OUTPUT_CAP ? `${text.slice(0, OUTPUT_CAP)}\n… (output truncated)` : text;
}

/** Allowlists for the shared table engine (techDockerContainersTable — computed dataset). */
const DOCKER_CONTAINER_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['name', 'image', 'id'],
  sortFields: {
    name: 'name',
    image: 'image',
    state: 'state',
    status: 'status',
    createdAt: 'createdAt',
  },
  filterFields: {
    name: { type: 'string' },
    image: { type: 'string' },
    state: { type: 'enum' },
    createdAt: { type: 'date' },
  },
  defaultSort: { name: 1 },
};

interface RawContainer {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
  Created: number;
}

export const techService = {
  async serverInfo(sslHost?: string): Promise<TechServerInfo> {
    const usagePercent = await cpuUsagePercent();
    const [disk, sshPort, ssl] = await Promise.all([
      buildDisk(),
      detectSshPort(),
      buildSsl(sslHost),
    ]);
    return {
      os: buildOs(),
      cpu: buildCpu(usagePercent),
      memory: buildMemory(),
      disk,
      network: buildNetwork(),
      sshPort,
      ssl,
      collectedAt: new Date().toISOString(),
    };
  },

  /** Table page over the COMPUTED containers list (no Model) — in-memory engine.
   * When Docker is unavailable dockerInfo() yields an empty containers array,
   * so this degrades to an empty page rather than erroring. */
  async containersTable(input?: TableQueryInput | null) {
    const info = await this.dockerInfo();
    const rows = info.containers as Array<TechDockerContainer & Record<string, unknown>>;
    return applyTableQueryInMemory(rows, input, DOCKER_CONTAINER_TABLE_CONFIG);
  },

  async dockerInfo(): Promise<TechDockerInfo> {
    try {
      const [version, list] = await Promise.all([
        dockerGet<{ Version: string }>('/version'),
        dockerGet<RawContainer[]>('/containers/json?all=1'),
      ]);
      const containers: TechDockerContainer[] = list.map((c) => ({
        id: c.Id.slice(0, 12),
        name: (c.Names[0] ?? '').replace(/^\//, ''),
        image: c.Image,
        state: c.State,
        status: c.Status,
        createdAt: c.Created ? new Date(c.Created * 1000).toISOString() : null,
      }));
      return {
        available: true,
        version: version.Version,
        error: null,
        containersRunning: containers.filter((c) => c.state === 'running').length,
        containersTotal: containers.length,
        containers,
      };
    } catch (err) {
      return {
        available: false,
        version: null,
        error: err instanceof Error ? err.message : 'Docker unavailable',
        containersRunning: 0,
        containersTotal: 0,
        containers: [],
      };
    }
  },

  /** Restart one container by name over the Docker socket. Audited. */
  async restartContainer(
    name: string,
    user: AuthUser,
  ): Promise<{ ok: boolean; error: string | null }> {
    logs.server.warn('tech', 'restartContainer', { userId: user.id, container: name });
    try {
      await dockerPost(
        `/containers/${encodeURIComponent(name)}/restart`,
        DOCKER_RESTART_TIMEOUT_MS,
      );
      return { ok: true, error: null };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Restart failed' };
    }
  },

  /** Recent (demuxed) logs for one container — polled by the restart log panel.
   * Never throws: a socket/permission error is returned as the "log" text. */
  async containerLogs(name: string, tail: number): Promise<string> {
    const n = Math.min(Math.max(1, Math.trunc(tail) || LOG_TAIL_DEFAULT), LOG_TAIL_MAX);
    try {
      const raw = await dockerGetRaw(
        `/containers/${encodeURIComponent(name)}/logs?stdout=1&stderr=1&tail=${n}`,
      );
      return capOutput(demuxDockerLogs(raw));
    } catch (err) {
      return err instanceof Error ? err.message : 'Logs unavailable';
    }
  },

  /** Run a shell command in the API container and return its output. This is an
   * intentional, SUPER_ADMIN-only ops terminal — host-root-equivalent via the
   * mounted docker socket, so every invocation is audited. Never rejects: a
   * failure surfaces as a non-zero exitCode + stderr. */
  async execCommand(
    command: string,
    user: AuthUser,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    logs.server.warn('tech', 'exec', { userId: user.id, command });
    return new Promise((resolve) => {
      exec(
        // NOSONAR — intentional SUPER_ADMIN-only ops terminal, audited above
        command,
        {
          timeout: EXEC_TIMEOUT_MS,
          maxBuffer: EXEC_MAX_BUFFER,
          cwd: process.cwd(),
          windowsHide: true,
        },
        (err, stdout, stderr) => {
          const failure = err as (Error & { code?: number | string }) | null;
          const exitCode = failure ? (typeof failure.code === 'number' ? failure.code : 1) : 0;
          resolve({ stdout: capOutput(stdout), stderr: capOutput(stderr), exitCode });
        },
      );
    });
  },
};
