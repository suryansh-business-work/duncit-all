import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProbeSection from './ProbeSection';
import type { ProbeResult, SslInfo } from '../../types';

const ssl = (over: Partial<SslInfo> = {}): SslInfo => ({
  authorized: true,
  issuer: 'Lets Encrypt',
  subject: 'server.test',
  validFrom: '2026-01-01T00:00:00.000Z',
  validTo: '2026-12-31T00:00:00.000Z',
  daysRemaining: 120,
  protocol: 'TLSv1.3',
  ...over,
});

const probe = (over: Partial<ProbeResult> = {}): ProbeResult => ({
  url: 'https://server.test',
  ok: true,
  statusCode: 200,
  statusText: 'OK',
  ssl: ssl(),
  ...over,
});

describe('ProbeSection', () => {
  it('renders the error alert when probing failed', () => {
    render(<ProbeSection probe={null} error="boom" />);
    expect(screen.getByText('boom')).toBeTruthy();
  });

  it('renders skeletons while the probe is loading', () => {
    const { container } = render(<ProbeSection probe={null} error={null} />);
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBe(3);
  });

  it('renders a full probe with SSL details and days-remaining', () => {
    render(<ProbeSection probe={probe()} error={null} />);
    expect(screen.getByText('200 OK')).toBeTruthy();
    expect(screen.getByText('Valid & trusted')).toBeTruthy();
    expect(screen.getByText('Lets Encrypt')).toBeTruthy();
    expect(screen.getByText(/120 days left/)).toBeTruthy();
    expect(screen.getByText('TLSv1.3')).toBeTruthy();
  });

  it('handles an untrusted certificate with missing fields', () => {
    render(
      <ProbeSection
        probe={probe({
          statusCode: 200,
          statusText: null,
          ssl: ssl({ authorized: false, issuer: null, subject: null, protocol: null, daysRemaining: null }),
        })}
        error={null}
      />,
    );
    expect(screen.getByText('200')).toBeTruthy();
    expect(screen.getByText('Not trusted')).toBeTruthy();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });

  it('shows the probe error text when there is no status code', () => {
    render(<ProbeSection probe={probe({ statusCode: null, statusText: null, error: 'ETIMEDOUT', ssl: null })} error={null} />);
    expect(screen.getByText('ETIMEDOUT')).toBeTruthy();
    expect(screen.getByText('No certificate')).toBeTruthy();
  });

  it('falls back to "Unreachable" when there is neither code nor error', () => {
    render(<ProbeSection probe={probe({ ok: false, statusCode: null, statusText: null, ssl: null })} error={null} />);
    expect(screen.getByText('Unreachable')).toBeTruthy();
  });
});
