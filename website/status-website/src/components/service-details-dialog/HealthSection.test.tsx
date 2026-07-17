import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import HealthSection from './HealthSection';
import type { HealthReport } from '../../types';

const health = (over: Partial<HealthReport> = {}): HealthReport => ({
  status: 'ok',
  version: '1.0.0',
  environment: 'production',
  node: 'v24.0.0',
  platform: 'linux',
  hostname: 'web-1',
  uptime: { processSeconds: 3600, systemSeconds: 90000 },
  memory: { rssBytes: 100, systemTotalBytes: 1000, systemFreeBytes: 400 },
  checks: { database: 'connected' },
  ...over,
});

describe('HealthSection', () => {
  it('shows an unavailable message when the health check failed', () => {
    render(<HealthSection health={null} failed />);
    expect(screen.getByText('Health details unavailable.')).toBeTruthy();
  });

  it('shows a skeleton while the report is loading', () => {
    const { container } = render(<HealthSection health={null} failed={false} />);
    expect(container.querySelector('.MuiSkeleton-root')).toBeTruthy();
  });

  it('renders a healthy report with computed memory usage', () => {
    render(<HealthSection health={health()} failed={false} />);
    expect(screen.getByText('1.0.0')).toBeTruthy();
    expect(screen.getByText('connected')).toBeTruthy();
    // used = 1000 - 400 = 600 bytes; total = 1000 bytes.
    expect(screen.getByText('600 B / 1000 B')).toBeTruthy();
  });

  it('handles a zero-memory, unhealthy report', () => {
    render(
      <HealthSection
        health={health({
          status: 'degraded',
          checks: { database: 'disconnected' },
          memory: { rssBytes: 0, systemTotalBytes: 0, systemFreeBytes: 0 },
        })}
        failed={false}
      />,
    );
    expect(screen.getByText('degraded')).toBeTruthy();
    expect(screen.getByText('disconnected')).toBeTruthy();
  });
});
