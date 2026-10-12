import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { ops, resetOps } from '../mocks/ops';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));

import SslPage from '../../src/pages/ssl';

const cert = (over: Record<string, unknown> = {}) => ({
  name: 'api-duncit',
  common_name: 'api.example.test',
  domains: ['api.example.test', 'www.example.test'],
  coverage: 'MULTI',
  key_type: 'ECDSA',
  issuer: 'Example CA',
  serial_number: 'AB:CD',
  fingerprint_sha256: '11:22',
  valid_from: '2026-01-01T00:00:00.000Z',
  valid_to: '2026-04-01T00:00:00.000Z',
  days_remaining: 60,
  renewal_due_at: '2026-03-01T00:00:00.000Z',
  authenticator: 'webroot',
  installer: null,
  production_ca: true,
  ...over,
});

const overview = (over: Record<string, unknown> = {}) => ({
  available: true,
  error: null,
  checked_at: '2026-01-02T00:00:00.000Z',
  certificates: [
    cert({ name: 'soon-cert', days_remaining: 5, coverage: 'WILDCARD', production_ca: false, issuer: null, common_name: null, authenticator: null }),
    cert(),
    cert({ name: 'gone-cert', days_remaining: -3, coverage: 'SINGLE', domains: ['old.example.test'] }),
  ],
  ...over,
});

const live = [
  { domain: 'api.example.test', checked: true, reachable: true, trusted: true, serving_this: true, valid_to: '2026-04-01T00:00:00.000Z', error: null },
  { domain: 'www.example.test', checked: true, reachable: true, trusted: true, serving_this: false, valid_to: null, error: null },
  { domain: 'down.example.test', checked: true, reachable: false, trusted: false, serving_this: false, valid_to: null, error: 'connection refused' },
  { domain: 'self.example.test', checked: true, reachable: true, trusted: false, serving_this: false, valid_to: null, error: null },
  { domain: 'skipped.example.test', checked: false, reachable: false, trusted: false, serving_this: false, valid_to: null, error: null },
];

beforeEach(() => {
  resetOps();
  ops.q = {
    SslCertificates: { data: { sslCertificates: overview() } },
    SslLiveCheck: { data: { sslLiveCheck: live } },
  };
});

describe('SSL certificates page', () => {
  it('summarises the fleet and names the certificates at risk', async () => {
    renderWithProviders(<SslPage />);
    expect(await screen.findByTestId('ssl-risk-banner')).toHaveTextContent('soon-cert');
    expect(screen.getByTestId('ssl-risk-banner')).toHaveTextContent('gone-cert');
    expect(screen.getByTestId('ssl-risk-banner')).not.toHaveTextContent('api-duncit');
    expect(screen.getByTestId('ssl-stat-count')).toHaveTextContent('3');
    expect(screen.getByTestId('ssl-stat-soonest')).toHaveTextContent('soon-cert');
    expect(screen.getByTestId('ssl-stat-hosts')).toHaveTextContent('5');
  });

  it('shows an expired certificate as expired rather than a negative number', async () => {
    renderWithProviders(<SslPage />);
    const row = (await screen.findByTestId('ssl-details-gone-cert')).closest('[role="row"]') as HTMLElement;
    expect(within(row).getByText('Expired 3 days ago')).toBeInTheDocument();
  });

  it('opens a certificate with its facts and live verdict per host', async () => {
    renderWithProviders(<SslPage />);
    fireEvent.click(await screen.findByTestId('ssl-details-soon-cert'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByTestId('ssl-ca')).toHaveTextContent('staging (untrusted)');
    expect(within(dialog).getByTestId('ssl-issuer')).toHaveTextContent('—');
    const list = await within(dialog).findByTestId('ssl-live-check');
    expect(within(list).getByText('Serving this certificate', { exact: false })).toBeInTheDocument();
    expect(within(list).getByText('connection refused')).toBeInTheDocument();
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('says certbot is unavailable instead of an empty table', async () => {
    ops.q.SslCertificates = { data: { sslCertificates: overview({ available: false, error: 'certbot missing', certificates: [] }) } };
    renderWithProviders(<SslPage />);
    expect(await screen.findByTestId('ssl-unavailable')).toHaveTextContent('certbot missing');
    expect(screen.queryByTestId('ssl-stat-count')).not.toBeInTheDocument();
  });

  it('shows a healthy fleet without a risk banner, and a failed read', async () => {
    ops.q.SslCertificates = { data: { sslCertificates: overview({ certificates: [cert({ days_remaining: 80 })] }) } };
    const first = renderWithProviders(<SslPage />);
    await screen.findByTestId('ssl-stat-count');
    expect(screen.queryByTestId('ssl-risk-banner')).not.toBeInTheDocument();
    first.unmount();
    ops.q.SslCertificates = { error: new Error('ssl read failed') };
    renderWithProviders(<SslPage />);
    expect(await screen.findByText('ssl read failed')).toBeInTheDocument();
  });
});
