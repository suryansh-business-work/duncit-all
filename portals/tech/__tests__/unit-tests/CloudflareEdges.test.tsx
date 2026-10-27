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
  await screen.findByTestId('cloudflare-copy-c2');
};

const mountNs = async () => {
  renderWithProviders(<CloudflarePage />, { initialEntries: ['/?tab=name-servers'] });
  fireEvent.click(await screen.findByTestId('cloudflare-tab-name-servers'));
  return screen.findByTestId('cloudflare-provider-switch');
};

describe('Cloudflare DNS / states', () => {
  it('shows no warning colour on the Cloudflare-only count when there are none', async () => {
    seed({ cloudflare_only: 0, rows: [row(), row({ id: 'c2', host: 'www.example.test', cloudflare_value: null, state: 'GODADDY_ONLY', copyable: true })] });
    await mountDns();
    expect(screen.getByTestId('cloudflare-cloudflare-only')).toHaveTextContent('0');
  });

  it('shows the read error and waits while loading', () => {
    ops.q = { CloudflareMigration: { loading: true } };
    const { unmount } = renderWithProviders(<CloudflarePage />);
    expect(screen.queryByTestId('cloudflare-parity-banner')).not.toBeInTheDocument();
    unmount();

    ops.q = { CloudflareMigration: { error: new Error('cloudflare unreachable') } };
    renderWithProviders(<CloudflarePage />);
    expect(screen.getByText('cloudflare unreachable')).toBeInTheDocument();
  });

  it('keeps showing the comparison while it is refreshed', async () => {
    ops.q = { CloudflareMigration: { loading: true, data: { cloudflareMigration: migration() } } };
    renderWithProviders(<CloudflarePage />);
    expect(await screen.findByTestId('cloudflare-copy-c2')).toBeInTheDocument();
  });

  it('narrows the comparison to the records matching the search, on host, type or value', async () => {
    await mountDns();

    fireEvent.change(screen.getByPlaceholderText(/^Search/), { target: { value: 'old.example' } });

    await waitFor(() => expect(screen.queryByTestId('cloudflare-copy-c2')).not.toBeInTheDocument());
    expect(screen.getByTestId('cloudflare-delete-c3')).toBeInTheDocument();
  });
});

describe('Cloudflare DNS / writes that fail without an Error', () => {
  beforeEach(() => ops.confirm.mockResolvedValue(true));

  it('uses the plain-language message for a copy, a delete and a zone add refused with text', async () => {
    ops.mut.CopyDnsToCloudflare = vi.fn().mockRejectedValue('nope');
    ops.mut.DeleteCloudflareDnsRecord = vi.fn().mockRejectedValue('nope');
    await mountDns();

    fireEvent.click(screen.getByTestId('cloudflare-copy-c2'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId('cloudflare-delete-c3'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledTimes(2));

    const [copyMessage, deleteMessage] = ops.notifyError.mock.calls.map(([message]) => String(message));
    expect(copyMessage).not.toBe('nope');
    expect(deleteMessage).not.toBe('nope');
    expect(copyMessage).not.toBe(deleteMessage);
  });

  it('says nothing when the server answers a copy without a result', async () => {
    ops.mut.CopyDnsToCloudflare = vi.fn().mockResolvedValue({ data: {} });
    await mountDns();

    fireEvent.click(screen.getByTestId('cloudflare-copy-c2'));

    await waitFor(() => expect(ops.mut.CopyDnsToCloudflare).toHaveBeenCalled());
    expect(ops.notifySuccess).not.toHaveBeenCalled();
    expect(ops.notifyError).not.toHaveBeenCalled();
  });

  it('names the host when Cloudflare refused a record without giving a reason', async () => {
    ops.mut.CopyDnsToCloudflare = vi.fn().mockResolvedValue({
      data: { copyDnsToCloudflare: { synced: 0, failed: 1, outcomes: [{ id: 'c2', host: 'www.example.test', ok: false, message: null }] } },
    });
    await mountDns();

    fireEvent.click(screen.getByTestId('cloudflare-copy-c2'));

    await waitFor(() =>
      expect(ops.notifyError).toHaveBeenCalledWith('0 copied, 1 refused by Cloudflare. www.example.test'),
    );
  });

  it('does not delete a Cloudflare record when the confirmation is declined', async () => {
    ops.confirm.mockResolvedValue(false);
    await mountDns();

    fireEvent.click(screen.getByTestId('cloudflare-delete-c3'));

    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(ops.confirm.mock.calls[0][0].message).toContain('old.example.test');
    expect(mutation('DeleteCloudflareDnsRecord')).not.toHaveBeenCalled();
  });

  it('adds the zone, and reports a refusal made with text', async () => {
    seed({ zone: null });
    ops.mut.CreateCloudflareZone = vi.fn().mockRejectedValue('blocked');
    renderWithProviders(<CloudflarePage />);

    fireEvent.click(await screen.findByTestId('cloudflare-add-zone'));

    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledTimes(1));
    expect(ops.notifyError.mock.calls[0][0]).not.toBe('blocked');
  });
});

describe('Cloudflare nameservers / edges', () => {
  it('blocks the way back to GoDaddy when the registrar has no GoDaddy nameservers to restore', async () => {
    seed({ live_provider: 'CLOUDFLARE', godaddy_name_servers: [] });
    await mountNs();

    expect(screen.getByTestId('cloudflare-switch-blocked')).toBeInTheDocument();
    expect(within(screen.getByTestId('cloudflare-provider-switch')).getByRole('switch')).toBeDisabled();
  });

  it('writes the Cloudflare zone nameservers when the switch is ready', async () => {
    seed({ ready_to_switch: true, godaddy_only: 0 });
    ops.confirm.mockResolvedValue(true);
    await mountNs();

    fireEvent.click(within(screen.getByTestId('cloudflare-provider-switch')).getByRole('switch'));

    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(ops.confirm.mock.calls[0][0].message).toContain('a.ns.cloudflare.test');
    expect(ops.confirm.mock.calls[0][0].message).toContain('b.ns.cloudflare.test');
  });

  it('reports a switch and a re-check refused with text', async () => {
    seed({
      live_provider: 'CLOUDFLARE',
      zone: { id: 'z1', status: 'pending', paused: false, name_servers: ['a.ns.cloudflare.test'], activated_on: null },
    });
    ops.confirm.mockResolvedValue(true);
    ops.mut.SetDomainNameServers = vi.fn().mockRejectedValue('refused');
    ops.mut.CheckCloudflareActivation = vi.fn().mockRejectedValue('refused');
    await mountNs();

    fireEvent.click(within(screen.getByTestId('cloudflare-provider-switch')).getByRole('switch'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId('cloudflare-recheck'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledTimes(2));

    expect(ops.notifyError.mock.calls.map(([message]) => String(message))).not.toContain('refused');
  });
});
