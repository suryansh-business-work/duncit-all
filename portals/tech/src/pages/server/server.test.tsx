import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { formatBytes, formatDate, formatDateTime, formatUptime } from './format';
import InfoList from './InfoList';
import ServerInfoDetails from './ServerInfoDetails';
import { SERVER_INFO, DOCKER_INFO, apiHost, hostFromUrl, type ServerInfo } from './queries';

describe('server format helpers', () => {
  it('formats bytes across unit ranges and edge values', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(-5)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(150 * 1024 ** 2)).toBe('150 MB'); // value >= 100 -> 0 digits
    expect(formatBytes(46 * 1024 ** 3)).toBe('46 GB'); // value >= 10 -> 1 digit
    expect(formatBytes(8 * 1024 ** 3)).toBe('8 GB'); // value < 10 -> 2 digits, zeros stripped
    expect(formatBytes(2 * 1024 ** 4)).toBe('2 TB');
  });

  it('formats uptime with day/hour/minute fallbacks', () => {
    expect(formatUptime(90000)).toBe('1d 1h'); // days truthy, minutes 0
    expect(formatUptime(90060)).toBe('1d 1h'); // days truthy + minutes truthy -> minute dropped
    expect(formatUptime(3600)).toBe('1h'); // hours only
    expect(formatUptime(120)).toBe('2m'); // minutes only, no days
    expect(formatUptime(30)).toBe('<1m'); // nothing -> fallback
  });

  it('formats dates defensively', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime('not-a-date')).toBe('—');
    expect(formatDateTime('2026-01-01T00:00:00.000Z')).not.toBe('—');
    expect(formatDate(null)).toBe('—');
    expect(formatDate('also-bad')).toBe('—');
    expect(formatDate('2026-01-01T00:00:00.000Z')).not.toBe('—');
  });
});

describe('queries host helpers', () => {
  it('extracts a hostname or returns undefined', () => {
    expect(hostFromUrl('https://server.duncit.com/graphql')).toBe('server.duncit.com');
    expect(hostFromUrl('not a url')).toBeUndefined();
    expect(apiHost()).toBeTruthy();
    expect(SERVER_INFO).toBeDefined();
    expect(DOCKER_INFO).toBeDefined();
  });
});

describe('InfoList', () => {
  it('renders string, number and node values', () => {
    render(
      <InfoList
        rows={[
          { label: 'Cores', value: 2 },
          { label: 'Host', value: 'srv' },
          { label: 'Status', value: <span data-testid="node-val">ok</span> },
        ]}
      />,
    );
    expect(screen.getByText('Cores')).toBeInTheDocument();
    expect(screen.getByText('srv')).toBeInTheDocument();
    expect(screen.getByTestId('node-val')).toBeInTheDocument();
  });
});

const baseInfo = (over: Partial<ServerInfo> = {}): ServerInfo => ({
  os: {
    platform: 'linux',
    distro: 'Linux',
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

describe('ServerInfoDetails', () => {
  it('renders a valid certificate, CPU clock and external network', () => {
    render(<ServerInfoDetails info={baseInfo()} />);
    expect(screen.getByText('srv912221')).toBeInTheDocument();
    expect(screen.getByText('Valid & trusted')).toBeInTheDocument();
    expect(screen.getByText("Let's Encrypt")).toBeInTheDocument();
    expect(screen.getByText('148.135.136.107')).toBeInTheDocument();
    expect(screen.getByText('2.40 GHz')).toBeInTheDocument();
  });

  it('handles an untrusted cert, missing fields and no external network', () => {
    render(
      <ServerInfoDetails
        info={baseInfo({
          cpu: { ...baseInfo().cpu, speedMhz: 0 },
          network: [{ name: 'lo', address: '127.0.0.1', family: 'IPv4', internal: true }],
          ssl: {
            host: 'server.duncit.com',
            valid: false,
            issuer: null,
            subject: null,
            validFrom: null,
            validTo: null,
            daysRemaining: null,
            protocol: null,
            error: null,
          },
        })}
      />,
    );
    expect(screen.getByText('Not trusted')).toBeInTheDocument();
    expect(screen.getByText('No external network interfaces detected.')).toBeInTheDocument();
  });

  it('shows the probe error when SSL lookup failed', () => {
    render(
      <ServerInfoDetails
        info={baseInfo({
          ssl: {
            host: 'server.duncit.com',
            valid: false,
            issuer: null,
            subject: null,
            validFrom: null,
            validTo: null,
            daysRemaining: null,
            protocol: null,
            error: 'Request timed out',
          },
        })}
      />,
    );
    expect(screen.getByText('Request timed out')).toBeInTheDocument();
  });

  it('falls back when no SSL info is present', () => {
    render(<ServerInfoDetails info={baseInfo({ ssl: null })} />);
    expect(screen.getByText('No certificate information available.')).toBeInTheDocument();
  });
});
