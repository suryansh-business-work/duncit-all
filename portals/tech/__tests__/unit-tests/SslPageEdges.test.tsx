import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { ops, resetOps } from '../mocks/ops';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));

import SslPage from '../../src/pages/ssl';

const cert = (over: Record<string, unknown> = {}) => ({
  name: 'prod-cert',
  common_name: 'prod.example.test',
  domains: ['prod.example.test'],
  coverage: 'SINGLE',
  key_type: 'RSA',
  issuer: 'Example CA',
  serial_number: 'AA:BB',
  fingerprint_sha256: '33:44',
  valid_from: '2026-01-01T00:00:00.000Z',
  valid_to: '2026-06-01T00:00:00.000Z',
  days_remaining: 90,
  renewal_due_at: '2026-05-01T00:00:00.000Z',
  authenticator: 'webroot',
  installer: 'nginx',
  production_ca: true,
  ...over,
});

const overview = (over: Record<string, unknown> = {}) => ({
  available: true,
  error: null,
  checked_at: '2026-01-02T00:00:00.000Z',
  certificates: [cert()],
  ...over,
});

beforeEach(() => {
  resetOps();
  ops.q = {
    SslCertificates: { data: { sslCertificates: overview() } },
    SslLiveCheck: { data: { sslLiveCheck: [] } },
  };
});

describe('SSL page edge cases', () => {
  it('shows dashes for the soonest expiry when certbot holds no certificates', async () => {
    ops.q.SslCertificates = { data: { sslCertificates: overview({ certificates: [] }) } };
    renderWithProviders(<SslPage />);
    expect(await screen.findByTestId('ssl-stat-soonest')).toHaveTextContent('—');
    expect(screen.getByTestId('ssl-stat-count')).toHaveTextContent('0');
    expect(screen.getByTestId('ssl-stat-hosts')).toHaveTextContent('0');
  });

  it('re-reads the certificates when Refresh is pressed', async () => {
    const refetch = vi.fn().mockResolvedValue({});
    ops.q.SslCertificates = { data: { sslCertificates: overview() }, refetch };
    renderWithProviders(<SslPage />);
    await screen.findByTestId('ssl-stat-count');
    fireEvent.click((screen.getAllByTestId('RefreshIcon')[0].closest('button') as HTMLButtonElement));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('disables Refresh and shows no subtitle while the first read is loading', () => {
    ops.q.SslCertificates = { loading: true };
    renderWithProviders(<SslPage />);
    expect((screen.getAllByTestId('RefreshIcon')[0].closest('button') as HTMLButtonElement)).toBeDisabled();
    expect(screen.queryByTestId('ssl-stat-count')).toBeNull();
  });

  it('marks a production-CA certificate as trusted in its detail dialog', async () => {
    renderWithProviders(<SslPage />);
    fireEvent.click(await screen.findByTestId('ssl-details-prod-cert'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByTestId('ssl-ca')).toHaveTextContent(/production/i);
    expect(within(dialog).getByTestId('ssl-common-name')).toHaveTextContent('prod.example.test');
    expect(within(dialog).getByTestId('ssl-installer')).toHaveTextContent('nginx');
  });
});
