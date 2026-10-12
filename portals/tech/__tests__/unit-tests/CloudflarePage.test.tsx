import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));

import CloudflarePage from '../../src/pages/cloudflare';

const row = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  type: 'A',
  name: 'api',
  host: 'api.example.test',
  priority: null,
  godaddy_value: '203.0.113.10',
  cloudflare_value: '203.0.113.10',
  proxied: false,
  state: 'BOTH',
  copyable: false,
  ...over,
});

const migration = (over: Record<string, unknown> = {}) => ({
  godaddy_configured: true,
  cloudflare_configured: true,
  connected: true,
  domain: 'example.test',
  cloudflare_domain: 'example.test',
  zone: { id: 'z1', status: 'active', paused: false, name_servers: ['a.ns.cloudflare.test', 'b.ns.cloudflare.test'], activated_on: null },
  rows: [
    row(),
    row({ id: 'c2', host: 'www.example.test', cloudflare_value: null, state: 'GODADDY_ONLY', copyable: true }),
    row({ id: 'c3', host: 'old.example.test', godaddy_value: null, state: 'CLOUDFLARE_ONLY', proxied: true }),
  ],
  matched: 1,
  godaddy_only: 1,
  cloudflare_only: 1,
  current_name_servers: ['ns1.godaddy.test'],
  godaddy_name_servers: ['ns1.godaddy.test', 'ns2.godaddy.test'],
  live_provider: 'GODADDY',
  ready_to_switch: false,
  ...over,
});

const seed = (over: Record<string, unknown> = {}) => {
  ops.q = { CloudflareMigration: { data: { cloudflareMigration: migration(over) } } };
};

beforeEach(() => {
  resetOps();
  seed();
});

const mountDns = async () => {
  renderWithProviders(<CloudflarePage />);
  return (await screen.findByTestId('cloudflare-copy-c2')).closest('[role="row"]') as HTMLElement;
};

describe('Cloudflare DNS compare', () => {
  it('shows parity numbers and why the nameservers cannot move yet', async () => {
    await mountDns();
    expect(screen.getByTestId('cloudflare-parity-banner')).toHaveTextContent('1');
    expect(screen.getByTestId('cloudflare-godaddy-only')).toHaveTextContent('1');
    expect(screen.getByTestId('cloudflare-copy-all')).toHaveTextContent('Copy all to Cloudflare (1)');
  });

  it('flags a fully matched zone as ready', async () => {
    seed({ ready_to_switch: true, godaddy_only: 0, rows: [row()] });
    renderWithProviders(<CloudflarePage />);
    expect(await screen.findByTestId('cloudflare-parity-banner')).toHaveTextContent('The nameservers can move');
    expect(screen.getByTestId('cloudflare-copy-all')).toBeDisabled();
  });

  it('marks proxied Cloudflare-only rows and offers delete only where Cloudflare has a value', async () => {
    await mountDns();
    expect(screen.getByText('Proxied')).toBeInTheDocument();
    expect(screen.queryByTestId('cloudflare-delete-c2')).not.toBeInTheDocument();
    expect(screen.getByTestId('cloudflare-delete-c3')).toBeInTheDocument();
    expect(screen.getByTestId('cloudflare-copy-c1')).toBeDisabled();
  });

  it('copies one row after confirmation', async () => {
    ops.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    ops.mut.CopyDnsToCloudflare = vi.fn().mockResolvedValue({ data: { copyDnsToCloudflare: { synced: 1, failed: 0, outcomes: [] } } });
    await mountDns();
    fireEvent.click(screen.getByTestId('cloudflare-copy-c2'));
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(ops.confirm.mock.calls[0][0].message).toContain('A www.example.test');
    expect(mutation('CopyDnsToCloudflare')).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('cloudflare-copy-c2'));
    await waitFor(() => expect(mutation('CopyDnsToCloudflare')).toHaveBeenCalledWith({ variables: { ids: ['c2'] } }));
    expect(ops.notifySuccess).toHaveBeenCalledWith('1 record(s) copied to Cloudflare.');
  });

  it('reports a partial copy with the first failure reason', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.CopyDnsToCloudflare = vi.fn().mockResolvedValue({
      data: { copyDnsToCloudflare: { synced: 0, failed: 1, outcomes: [{ id: 'c2', host: 'www', ok: false, message: 'proxied record conflicts' }] } },
    });
    await mountDns();
    fireEvent.click(screen.getByTestId('cloudflare-copy-all'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('0 copied, 1 refused by Cloudflare. proxied record conflicts'));
  });

  it('reports a copy that threw, and a delete that threw', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.CopyDnsToCloudflare = vi.fn().mockRejectedValue(new Error('cf 500'));
    ops.mut.DeleteCloudflareDnsRecord = vi.fn().mockRejectedValue(new Error('cannot delete'));
    await mountDns();
    fireEvent.click(screen.getByTestId('cloudflare-copy-c2'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('cf 500'));
    fireEvent.click(screen.getByTestId('cloudflare-delete-c3'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('cannot delete'));
  });

  it('removes a Cloudflare record after confirmation', async () => {
    ops.confirm.mockResolvedValue(true);
    await mountDns();
    fireEvent.click(screen.getByTestId('cloudflare-delete-c3'));
    await waitFor(() => expect(mutation('DeleteCloudflareDnsRecord')).toHaveBeenCalledWith({ variables: { id: 'c3' } }));
    expect(ops.notifySuccess).toHaveBeenCalledWith('Deleted');
  });

  it('offers to add the missing zone, and reports failure', async () => {
    seed({ zone: null });
    ops.mut.CreateCloudflareZone = vi.fn().mockRejectedValueOnce(new Error('plan limit')).mockResolvedValue({ data: {} });
    renderWithProviders(<CloudflarePage />);
    fireEvent.click(await screen.findByTestId('cloudflare-add-zone'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('plan limit'));
    fireEvent.click(screen.getByTestId('cloudflare-add-zone'));
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith('Zone added to Cloudflare.'));
  });

  it.each([
    [{ connected: false, godaddy_configured: true, cloudflare_configured: false }, /Add a Cloudflare entry/],
    [{ connected: false, godaddy_configured: false, cloudflare_configured: true }, /needs the GoDaddy entry/],
    [{ connected: false, cloudflare_domain: 'other.test' }, /GoDaddy manages example.test but the Cloudflare entry names other.test/],
  ])('explains an unconnected setup (%j)', async (over, message) => {
    seed(over);
    renderWithProviders(<CloudflarePage />);
    expect(await screen.findByTestId('cloudflare-not-connected')).toHaveTextContent(message);
  });

  it('shows the query error', async () => {
    ops.q.CloudflareMigration = { error: new Error('cloudflare unreachable') };
    renderWithProviders(<CloudflarePage />);
    expect(await screen.findByText('cloudflare unreachable')).toBeInTheDocument();
  });
});
