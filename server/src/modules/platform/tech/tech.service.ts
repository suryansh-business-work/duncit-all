/**
 * Tech-portal "Server" data: host system metrics (OS, CPU, memory, disk,
 * network, SSH, SSL) and Docker container status — all gathered live from the
 * machine the API runs on. Built on Node core only (os / fs / http); Docker is
 * read over its unix socket when mounted (graceful "unavailable" otherwise).
 */
import os from 'node:os';
import { statfs, readFile } from 'node:fs/promises';
import http from 'node:http';
import { probe, isAllowedHost } from '../../../observability/statusProbe';

const DOCKER_SOCKET = process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock';
const DOCKER_TIMEOUT_MS = 4000;
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
    return { path, totalBytes: total, freeBytes: free, usedBytes: used, usagePercent: pct(used, total) };
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
    const line = text.split('\n').map((l) => l.trim()).find((l) => /^Port\s+\d+/i.test(l));
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
    const [disk, sshPort, ssl] = await Promise.all([buildDisk(), detectSshPort(), buildSsl(sslHost)]);
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
};
