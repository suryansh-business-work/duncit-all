/**
 * Unit cover for the tech "Server" surface: host metrics gathered from node
 * core, the Docker unix-socket client (info / restart / logs) and the
 * SUPER_ADMIN ops terminal. Every I/O boundary (os, fs, http, child_process,
 * the SSL probe) is replaced by a fake so the assertions are about the shaping
 * and failure handling, not about the machine the suite happens to run on.
 */
jest.mock('node:os', () => ({
  cpus: jest.fn(),
  loadavg: jest.fn(),
  platform: jest.fn(),
  type: jest.fn(),
  release: jest.fn(),
  arch: jest.fn(),
  hostname: jest.fn(),
  uptime: jest.fn(),
  totalmem: jest.fn(),
  freemem: jest.fn(),
  networkInterfaces: jest.fn(),
}));
jest.mock('node:fs/promises', () => ({ statfs: jest.fn(), readFile: jest.fn() }));
jest.mock('node:http', () => ({ request: jest.fn() }));
jest.mock('node:child_process', () => ({ exec: jest.fn() }));
jest.mock('@observability/statusProbe', () => ({ probe: jest.fn(), isAllowedHost: jest.fn() }));
jest.mock('@observability/log', () => ({
  logs: { server: { warn: jest.fn(), error: jest.fn() } },
}));

import os from 'node:os';
import { statfs, readFile } from 'node:fs/promises';
import http from 'node:http';
import { exec } from 'node:child_process';
import { logs } from '@observability/log';
import { probe, isAllowedHost } from '@observability/statusProbe';
import type { AuthUser } from '@context';
import { techService } from '../../tech.service';

const osMock = os as unknown as Record<string, jest.Mock>;
const statfsMock = statfs as unknown as jest.Mock;
const readFileMock = readFile as unknown as jest.Mock;
const execMock = exec as unknown as jest.Mock;
const probeMock = probe as unknown as jest.Mock;
const isAllowedHostMock = isAllowedHost as unknown as jest.Mock;
const warnMock = logs.server.warn as unknown as jest.Mock;

const ACTOR = { id: 'u-super-1', email: 'root@duncit.com' } as unknown as AuthUser;

/** One fake core; `busy` lands in `user` so total = busy + idle. */
const cpuSnapshot = (idle: number, busy: number) => [
  { model: '  Intel Xeon Gold  ', speed: 2400, times: { user: busy, nice: 0, sys: 0, idle, irq: 0 } },
];

/* ------------------------------------------------------------------ *
 * Fake http.request driver: every docker call goes through this.      *
 * ------------------------------------------------------------------ */

type ReqEvent = 'timeout' | 'error';

/** Build a fake ClientRequest whose `end()` triggers `run(handlers)`. */
const fakeRequest = (run: (handlers: Record<ReqEvent, (e?: unknown) => void>) => void) => {
  const handlers = {} as Record<ReqEvent, (e?: unknown) => void>;
  const req: Record<string, unknown> = {
    on: (event: ReqEvent, handler: (e?: unknown) => void) => {
      handlers[event] = handler;
      return req;
    },
    end: () => run(handlers),
    destroy: jest.fn(),
  };
  return req;
};

/** Reply to the next http.request with a status code and body chunks. */
function replyWith(statusCode: number | undefined, chunks: Array<string | Buffer>) {
  (http.request as unknown as jest.Mock).mockImplementation(
    (_options: unknown, cb: (res: unknown) => void) =>
      fakeRequest(() => {
        const res = {
          statusCode,
          setEncoding: jest.fn(),
          on: (event: string, handler: (chunk?: unknown) => void) => {
            if (event === 'data') chunks.forEach((chunk) => handler(chunk));
            if (event === 'end') handler();
          },
        };
        cb(res);
      })
  );
}

/** Make the socket time out (the request emits 'timeout' and is destroyed). */
function replyTimeout() {
  (http.request as unknown as jest.Mock).mockImplementation(() =>
    fakeRequest((handlers) => handlers.timeout())
  );
}

/** Make the socket fail; `cause` is emitted verbatim on 'error'. */
function replyError(cause: unknown) {
  (http.request as unknown as jest.Mock).mockImplementation(() =>
    fakeRequest((handlers) => handlers.error(cause))
  );
}

/** Docker's non-TTY log framing: [stream,0,0,0,len(BE32)] + payload. */
const frame = (stream: number, payload: string) => {
  const body = Buffer.from(payload, 'utf8');
  const header = Buffer.alloc(8);
  header[0] = stream;
  header.writeUInt32BE(body.length, 4);
  return Buffer.concat([header, body]);
};

beforeEach(() => {
  osMock.cpus.mockReturnValue(cpuSnapshot(1000, 0));
  osMock.loadavg.mockReturnValue([0.5, 1.25, 2]);
  osMock.platform.mockReturnValue('linux');
  osMock.type.mockReturnValue('Linux');
  osMock.release.mockReturnValue('6.8.0-40-generic');
  osMock.arch.mockReturnValue('x64');
  osMock.hostname.mockReturnValue('duncit-vps');
  osMock.uptime.mockReturnValue(123456.7);
  osMock.totalmem.mockReturnValue(16_000_000_000);
  osMock.freemem.mockReturnValue(4_000_000_000);
  osMock.networkInterfaces.mockReturnValue({});
  statfsMock.mockResolvedValue({ blocks: 1000, bsize: 4096, bfree: 250 });
  readFileMock.mockResolvedValue('');
  isAllowedHostMock.mockReturnValue(false);
});

describe('techService.serverInfo — CPU', () => {
  it('reports real usage from two snapshots and the trimmed CPU model', async () => {
    // 50 idle ticks out of 100 elapsed ticks => 50% busy.
    osMock.cpus
      .mockReturnValueOnce(cpuSnapshot(1000, 0))
      .mockReturnValueOnce(cpuSnapshot(1050, 50));

    const info = await techService.serverInfo();

    expect(info.cpu.usagePercent).toBe(50);
    expect(info.cpu.model).toBe('Intel Xeon Gold');
    expect(info.cpu.cores).toBe(1);
    expect(info.cpu.speedMhz).toBe(2400);
    expect(info.cpu).toMatchObject({ loadAvg1: 0.5, loadAvg5: 1.25, loadAvg15: 2 });
  });

  it('reports 0% when no CPU ticks elapsed between the snapshots', async () => {
    osMock.cpus.mockReturnValue(cpuSnapshot(1000, 0));
    const info = await techService.serverInfo();
    expect(info.cpu.usagePercent).toBe(0);
  });

  it('falls back to Unknown / zeros when os reports no cores and no load average', async () => {
    osMock.cpus.mockReturnValue([]);
    osMock.loadavg.mockReturnValue([]);

    const info = await techService.serverInfo();

    expect(info.cpu).toMatchObject({
      model: 'Unknown',
      cores: 0,
      speedMhz: 0,
      loadAvg1: 0,
      loadAvg5: 0,
      loadAvg15: 0,
    });
  });
});

describe('techService.serverInfo — OS, memory, disk and network', () => {
  it('labels a known platform and rounds the uptimes', async () => {
    const info = await techService.serverInfo();
    expect(info.os).toMatchObject({
      platform: 'linux',
      distro: 'Linux',
      type: 'Linux',
      release: '6.8.0-40-generic',
      arch: 'x64',
      hostname: 'duncit-vps',
      kernelUptimeSeconds: 123457,
      nodeVersion: process.version,
    });
    expect(Number.isInteger(info.os.processUptimeSeconds)).toBe(true);
    expect(info.collectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('falls back to the raw platform name when there is no friendly label', async () => {
    osMock.platform.mockReturnValue('freebsd');
    const info = await techService.serverInfo();
    expect(info.os.distro).toBe('freebsd');
  });

  it('derives used memory and its percentage', async () => {
    const info = await techService.serverInfo();
    expect(info.memory).toEqual({
      totalBytes: 16_000_000_000,
      freeBytes: 4_000_000_000,
      usedBytes: 12_000_000_000,
      usagePercent: 75,
    });
  });

  it('reports 0% rather than dividing by zero when total memory is 0', async () => {
    osMock.totalmem.mockReturnValue(0);
    osMock.freemem.mockReturnValue(0);
    const info = await techService.serverInfo();
    expect(info.memory).toEqual({
      totalBytes: 0,
      freeBytes: 0,
      usedBytes: 0,
      usagePercent: 0,
    });
  });

  it('statfs the POSIX root and converts blocks to bytes', async () => {
    const info = await techService.serverInfo();
    expect(statfsMock).toHaveBeenCalledWith('/');
    expect(info.disk).toEqual({
      path: '/',
      totalBytes: 4_096_000,
      freeBytes: 1_024_000,
      usedBytes: 3_072_000,
      usagePercent: 75,
    });
  });

  it('statfs the drive root on Windows', async () => {
    osMock.platform.mockReturnValue('win32');
    // process.cwd() is the one host boundary buildDisk still reads, and faking
    // os.platform() alone does not fake it. On a POSIX runner the real cwd
    // starts with "/", so the drive-root split yields "" and the path becomes a
    // lone "\" — this assertion passed only on a Windows machine and failed on
    // every Linux CI run. Fake the cwd and assert the exact root.
    const cwd = jest.spyOn(process, 'cwd').mockReturnValue('D:\\srv\\duncit\\server');
    try {
      const info = await techService.serverInfo();
      expect(info.disk.path).toBe('D:\\');
      expect(statfsMock).toHaveBeenCalledWith('D:\\');
    } finally {
      cwd.mockRestore();
    }
  });

  it('degrades to a zeroed disk when statfs is not permitted', async () => {
    statfsMock.mockRejectedValue(new Error('EPERM'));
    const info = await techService.serverInfo();
    expect(info.disk).toEqual({
      path: '/',
      totalBytes: 0,
      freeBytes: 0,
      usedBytes: 0,
      usagePercent: 0,
    });
  });

  it('flattens every interface address and skips an interface with none', async () => {
    osMock.networkInterfaces.mockReturnValue({
      lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
      eth0: [{ address: '10.0.0.4', family: 'IPv4', internal: false }],
      tun0: undefined,
    });

    const info = await techService.serverInfo();

    expect(info.network).toEqual([
      { name: 'lo', address: '127.0.0.1', family: 'IPv4', internal: true },
      { name: 'eth0', address: '10.0.0.4', family: 'IPv4', internal: false },
    ]);
  });
});

describe('techService.serverInfo — SSH port', () => {
  it('reads a custom Port directive out of sshd_config', async () => {
    readFileMock.mockResolvedValue('# comment\n  Port 2222 \nPermitRootLogin no\n');
    const info = await techService.serverInfo();
    expect(readFileMock).toHaveBeenCalledWith('/etc/ssh/sshd_config', 'utf8');
    expect(info.sshPort).toBe(2222);
  });

  it('defaults to 22 when sshd_config declares no Port', async () => {
    readFileMock.mockResolvedValue('PermitRootLogin no\n');
    const info = await techService.serverInfo();
    expect(info.sshPort).toBe(22);
  });

  it('defaults to 22 when sshd_config is absent (inside a container)', async () => {
    readFileMock.mockRejectedValue(new Error('ENOENT'));
    const info = await techService.serverInfo();
    expect(info.sshPort).toBe(22);
  });
});

describe('techService.serverInfo — SSL', () => {
  it('returns no certificate block when no host is asked for', async () => {
    const info = await techService.serverInfo();
    expect(info.ssl).toBeNull();
    expect(probeMock).not.toHaveBeenCalled();
  });

  it('refuses to probe a host outside the platform allowlist (SSRF guard)', async () => {
    isAllowedHostMock.mockReturnValue(false);
    const info = await techService.serverInfo('evil.example.com');
    expect(isAllowedHostMock).toHaveBeenCalledWith('evil.example.com');
    expect(info.ssl).toBeNull();
    expect(probeMock).not.toHaveBeenCalled();
  });

  it('summarises the certificate for an allowlisted host', async () => {
    isAllowedHostMock.mockReturnValue(true);
    probeMock.mockResolvedValue({
      error: undefined,
      ssl: {
        authorized: true,
        issuer: "Let's Encrypt",
        subject: 'server.duncit.com',
        validFrom: '2026-06-01T00:00:00.000Z',
        validTo: '2026-09-01T00:00:00.000Z',
        daysRemaining: 34,
        protocol: 'TLSv1.3',
      },
    });

    const info = await techService.serverInfo('server.duncit.com');

    expect(probeMock).toHaveBeenCalledWith(new URL('https://server.duncit.com'));
    expect(info.ssl).toEqual({
      host: 'server.duncit.com',
      valid: true,
      issuer: "Let's Encrypt",
      subject: 'server.duncit.com',
      validFrom: '2026-06-01T00:00:00.000Z',
      validTo: '2026-09-01T00:00:00.000Z',
      daysRemaining: 34,
      protocol: 'TLSv1.3',
      error: null,
    });
  });

  it('reports an unreachable host as invalid with the probe error', async () => {
    isAllowedHostMock.mockReturnValue(true);
    probeMock.mockResolvedValue({ ssl: null, error: 'ECONNREFUSED' });

    const info = await techService.serverInfo('server.duncit.com');

    expect(info.ssl).toEqual({
      host: 'server.duncit.com',
      valid: false,
      issuer: null,
      subject: null,
      validFrom: null,
      validTo: null,
      daysRemaining: null,
      protocol: null,
      error: 'ECONNREFUSED',
    });
  });
});

describe('techService.dockerInfo', () => {
  it('maps the container list and counts the running ones', async () => {
    (http.request as unknown as jest.Mock).mockImplementation(
      (options: { path: string }, cb: (res: unknown) => void) => {
        const body = options.path.startsWith('/version')
          ? JSON.stringify({ Version: '27.0.1' })
          : JSON.stringify([
              {
                Id: 'aaaaaaaaaaaabbbbbbbb',
                Names: ['/duncit-api'],
                Image: 'duncit/api:prod',
                State: 'running',
                Status: 'Up 3 days',
                Created: 1_780_000_000,
              },
              {
                Id: 'ccccccccccccdddddddd',
                Names: [],
                Image: 'mongo:7',
                State: 'exited',
                Status: 'Exited (0)',
                Created: 0,
              },
            ]);
        return fakeRequest(() => {
          cb({
            statusCode: 200,
            setEncoding: jest.fn(),
            on: (event: string, handler: (chunk?: unknown) => void) => {
              if (event === 'data') handler(body);
              if (event === 'end') handler();
            },
          });
        });
      }
    );

    const info = await techService.dockerInfo();

    expect(info.available).toBe(true);
    expect(info.version).toBe('27.0.1');
    expect(info.error).toBeNull();
    expect(info.containersRunning).toBe(1);
    expect(info.containersTotal).toBe(2);
    expect(info.containers[0]).toEqual({
      id: 'aaaaaaaaaaaa',
      name: 'duncit-api',
      image: 'duncit/api:prod',
      state: 'running',
      status: 'Up 3 days',
      createdAt: '2026-05-28T20:26:40.000Z',
    });
    // No Names entry and no Created timestamp still produce a valid row.
    expect(info.containers[1]).toMatchObject({ name: '', createdAt: null });
  });

  it('reports the Docker HTTP status when the daemon refuses the call', async () => {
    replyWith(403, ['forbidden']);
    const info = await techService.dockerInfo();
    expect(info).toMatchObject({
      available: false,
      version: null,
      error: 'Docker API responded 403',
      containersRunning: 0,
      containersTotal: 0,
      containers: [],
    });
  });

  it('still fails a response that carries no status code at all', async () => {
    replyWith(undefined, ['']);
    const info = await techService.dockerInfo();
    expect(info).toMatchObject({ available: false, error: 'Docker API responded undefined' });
  });

  it('reports a non-JSON body as an invalid response', async () => {
    replyWith(200, ['<html>not json</html>']);
    const info = await techService.dockerInfo();
    expect(info.error).toBe('Invalid Docker API response');
  });

  it('reports a socket timeout', async () => {
    replyTimeout();
    const info = await techService.dockerInfo();
    expect(info).toMatchObject({ available: false, error: 'Docker API timed out' });
  });

  it('falls back to a generic message when the socket rejects with a non-Error', async () => {
    replyError('EACCES on /var/run/docker.sock');
    const info = await techService.dockerInfo();
    expect(info.error).toBe('Docker unavailable');
  });
});

describe('techService.restartContainer', () => {
  it('POSTs the restart, url-encodes the name and audits the acting user', async () => {
    replyWith(204, []);

    const result = await techService.restartContainer('duncit crm', ACTOR);

    expect(result).toEqual({ ok: true, error: null });
    expect(warnMock).toHaveBeenCalledWith('tech', 'restartContainer', {
      userId: 'u-super-1',
      container: 'duncit crm',
    });
    const [options] = (http.request as unknown as jest.Mock).mock.calls[0];
    expect(options).toMatchObject({
      method: 'POST',
      path: '/containers/duncit%20crm/restart',
      socketPath: '/var/run/docker.sock',
    });
  });

  it('surfaces the daemon status and body when the restart is rejected', async () => {
    replyWith(409, ['  container already restarting  ']);
    const result = await techService.restartContainer('duncit-api', ACTOR);
    expect(result).toEqual({
      ok: false,
      error: 'Docker API responded 409: container already restarting',
    });
  });

  it('omits the detail suffix when the daemon returns an empty body', async () => {
    replyWith(500, []);
    const result = await techService.restartContainer('duncit-api', ACTOR);
    expect(result).toEqual({ ok: false, error: 'Docker API responded 500' });
  });

  it('treats a missing status code as a 500', async () => {
    replyWith(undefined, []);
    const result = await techService.restartContainer('duncit-api', ACTOR);
    expect(result.error).toBe('Docker API responded 500');
  });

  it('reports a restart timeout', async () => {
    replyTimeout();
    const result = await techService.restartContainer('duncit-api', ACTOR);
    expect(result).toEqual({ ok: false, error: 'Docker API timed out' });
    const [options] = (http.request as unknown as jest.Mock).mock.calls[0];
    // A restart waits out the container's stop-timeout, so it gets a longer budget.
    expect(options.timeout).toBe(30_000);
  });

  it('falls back to a generic message when the socket rejects with a non-Error', async () => {
    replyError({ errno: -13 });
    const result = await techService.restartContainer('duncit-api', ACTOR);
    expect(result).toEqual({ ok: false, error: 'Restart failed' });
  });
});

describe('techService.containerLogs', () => {
  it('demuxes the stdout/stderr frames and asks for the requested tail', async () => {
    replyWith(200, [frame(1, 'hello '), frame(2, 'world\n')]);

    const text = await techService.containerLogs('duncit-api', 50);

    expect(text).toBe('hello world\n');
    const [options] = (http.request as unknown as jest.Mock).mock.calls[0];
    expect(options.path).toBe('/containers/duncit-api/logs?stdout=1&stderr=1&tail=50');
  });

  it('returns TTY (unframed) output as raw text', async () => {
    replyWith(200, [Buffer.from('raw tty output without framing', 'utf8')]);
    const text = await techService.containerLogs('duncit-api', 10);
    expect(text).toBe('raw tty output without framing');
  });

  it('returns a body too short to be framed as raw text', async () => {
    replyWith(200, [Buffer.from('short', 'utf8')]);
    const text = await techService.containerLogs('duncit-api', 10);
    expect(text).toBe('short');
  });

  it.each([
    ['a zero tail falls back to the default', 0, 200],
    ['a huge tail is clamped to the maximum', 5000, 1000],
    ['a negative tail is clamped to one line', -20, 1],
    ['a fractional tail is truncated', 12.9, 12],
  ])('%s', async (_case, requested, expected) => {
    replyWith(200, [frame(1, 'x')]);
    await techService.containerLogs('duncit-api', requested);
    const [options] = (http.request as unknown as jest.Mock).mock.calls[0];
    expect(options.path).toBe(`/containers/duncit-api/logs?stdout=1&stderr=1&tail=${expected}`);
  });

  it('truncates output beyond the 64 KB API cap', async () => {
    replyWith(200, [frame(1, 'y'.repeat(70_000))]);
    const text = await techService.containerLogs('duncit-api', 1000);
    expect(text).toHaveLength(64 * 1024 + '\n… (output truncated)'.length);
    expect(text.endsWith('\n… (output truncated)')).toBe(true);
  });

  it('returns the Docker error text instead of throwing', async () => {
    replyWith(404, []);
    await expect(techService.containerLogs('nope', 10)).resolves.toBe('Docker API responded 404');
  });

  it('reports a log-stream timeout as the log text', async () => {
    replyTimeout();
    await expect(techService.containerLogs('duncit-api', 10)).resolves.toBe('Docker API timed out');
  });

  it('still fails a log-stream response that carries no status code at all', async () => {
    replyWith(undefined, []);
    await expect(techService.containerLogs('duncit-api', 10)).resolves.toBe(
      'Docker API responded undefined'
    );
  });

  it('falls back to a generic message when the socket rejects with a non-Error', async () => {
    replyError('boom');
    await expect(techService.containerLogs('duncit-api', 10)).resolves.toBe('Logs unavailable');
  });
});

describe('techService.execCommand', () => {
  /** Run the callback `exec` was given with the supplied result. */
  const execResolves = (err: unknown, stdout: string, stderr: string) => {
    execMock.mockImplementation(
      (_cmd: string, _opts: unknown, cb: (e: unknown, o: string, s: string) => void) =>
        cb(err, stdout, stderr)
    );
  };

  it('audits the acting SUPER_ADMIN and the exact command before running it', async () => {
    execResolves(null, 'total 0\n', '');

    const result = await techService.execCommand('ls -la /opt/duncit', ACTOR);

    expect(warnMock).toHaveBeenCalledWith('tech', 'exec', {
      userId: 'u-super-1',
      command: 'ls -la /opt/duncit',
    });
    expect(result).toEqual({ stdout: 'total 0\n', stderr: '', exitCode: 0 });
    const [command, options] = execMock.mock.calls[0];
    expect(command).toBe('ls -la /opt/duncit');
    expect(options).toMatchObject({ timeout: 30_000, maxBuffer: 1024 * 1024, windowsHide: true });
  });

  it('returns the child process exit code instead of rejecting', async () => {
    execResolves(Object.assign(new Error('exited'), { code: 127 }), '', 'command not found\n');
    const result = await techService.execCommand('nosuchbin', ACTOR);
    expect(result).toEqual({ stdout: '', stderr: 'command not found\n', exitCode: 127 });
  });

  it('maps a non-numeric failure code (e.g. a kill signal) to exit code 1', async () => {
    execResolves(Object.assign(new Error('killed'), { code: 'ETIMEDOUT' }), 'partial', '');
    const result = await techService.execCommand('sleep 999', ACTOR);
    expect(result).toMatchObject({ exitCode: 1, stdout: 'partial' });
  });

  it('caps runaway stdout at 64 KB', async () => {
    execResolves(null, 'z'.repeat(70_000), '');
    const result = await techService.execCommand('cat huge.log', ACTOR);
    expect(result.stdout.endsWith('\n… (output truncated)')).toBe(true);
    expect(result.stdout).toHaveLength(64 * 1024 + '\n… (output truncated)'.length);
  });
});

describe('docker socket location', () => {
  it('honours DOCKER_SOCKET_PATH over the default socket', async () => {
    process.env.DOCKER_SOCKET_PATH = '/tmp/alt-docker.sock';
    let altHttp: { request: jest.Mock } | undefined;
    let altService: typeof techService | undefined;
    jest.isolateModules(() => {
      altHttp = require('node:http');
      altService = require('../../tech.service').techService;
    });
    altHttp!.request.mockImplementation(() => fakeRequest((handlers) => handlers.timeout()));

    await altService!.containerLogs('duncit-api', 10);

    expect(altHttp!.request.mock.calls[0][0].socketPath).toBe('/tmp/alt-docker.sock');
    delete process.env.DOCKER_SOCKET_PATH;
  });
});
