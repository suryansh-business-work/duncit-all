import type {
  DockerContainer,
  DockerInfo,
  ServerInfo,
} from '../../src/pages/server/queries';

/**
 * Server/Docker mocks. The tech portal exposes these host-metric shapes as
 * hand-written projections of the schema's `TechServerInfo` / `TechDockerInfo`
 * types in `server/queries.ts` — the exact contract `ServerInfoDetails`,
 * `ServerInfoPage` and `DockerPage` consume — so the factories are typed against
 * those consumed interfaces (no `any`).
 */
export const makeServerInfo = (over: Partial<ServerInfo> = {}): ServerInfo => ({
  os: {
    platform: 'linux',
    distro: 'Ubuntu 24.04',
    type: 'Linux',
    release: '6.8.0',
    arch: 'x64',
    hostname: 'srv912221',
    kernelUptimeSeconds: 7000000,
    processUptimeSeconds: 3600,
    nodeVersion: 'v20.11.0',
  },
  cpu: { model: 'KVM', cores: 2, speedMhz: 2400, loadAvg1: 0.5, loadAvg5: 0.4, loadAvg15: 0.3, usagePercent: 45 },
  memory: { totalBytes: 8 * 1024 ** 3, freeBytes: 4 * 1024 ** 3, usedBytes: 4 * 1024 ** 3, usagePercent: 50 },
  disk: { path: '/', totalBytes: 100 * 1024 ** 3, freeBytes: 54 * 1024 ** 3, usedBytes: 46 * 1024 ** 3, usagePercent: 46 },
  network: [
    { name: 'eth0', address: '148.135.136.107', family: 'IPv4', internal: false },
    { name: 'lo', address: '127.0.0.1', family: 'IPv4', internal: true },
  ],
  sshPort: 22,
  ssl: {
    host: 'server.duncit.com',
    valid: true,
    issuer: "Let's Encrypt",
    subject: 'server.duncit.com',
    validFrom: '2026-01-01T00:00:00.000Z',
    validTo: '2026-04-01T00:00:00.000Z',
    daysRemaining: 30,
    protocol: 'TLSv1.3',
    error: null,
  },
  collectedAt: '2026-06-09T10:00:00.000Z',
  ...over,
});

export const makeDockerContainer = (over: Partial<DockerContainer> = {}): DockerContainer => ({
  id: 'abc123',
  name: 'server',
  image: 'duncit/server:latest',
  state: 'running',
  status: 'Up 3 days',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

export const makeDockerInfo = (over: Partial<DockerInfo> = {}): DockerInfo => ({
  available: true,
  version: '25.0',
  error: null,
  containersRunning: 3,
  containersTotal: 5,
  containers: [],
  ...over,
});
