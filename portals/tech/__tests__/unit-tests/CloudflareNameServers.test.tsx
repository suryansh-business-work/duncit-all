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

describe('Cloudflare nameservers', () => {
  const mountNs = async () => {
    renderWithProviders(<CloudflarePage />, { initialEntries: ['/?tab=name-servers'] });
    fireEvent.click(await screen.findByTestId('cloudflare-tab-name-servers'));
    return screen.findByTestId('cloudflare-provider-switch');
  };

  it('lists current, assigned and GoDaddy nameservers and blocks the switch until parity', async () => {
    await mountNs();
    expect(screen.getByTestId('cloudflare-ns-assigned')).toHaveTextContent('a.ns.cloudflare.test');
    expect(screen.getByTestId('cloudflare-ns-godaddy')).toHaveTextContent('ns2.godaddy.test');
    expect(screen.getByTestId('cloudflare-switch-blocked')).toBeInTheDocument();
    expect(within(screen.getByTestId('cloudflare-provider-switch')).getByRole('switch')).toBeDisabled();
  });

  it('blocks switching without a zone, and back to GoDaddy without GoDaddy nameservers', async () => {
    seed({ zone: null });
    await mountNs();
    expect(screen.getByTestId('cloudflare-switch-blocked')).toHaveTextContent('Add the zone to Cloudflare');
  });

  it('switches to Cloudflare once ready, after confirmation', async () => {
    seed({ ready_to_switch: true, godaddy_only: 0 });
    ops.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await mountNs();
    const toggle = within(screen.getByTestId('cloudflare-provider-switch')).getByRole('switch');
    fireEvent.click(toggle);
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(mutation('SetDomainNameServers')).not.toHaveBeenCalled();
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(mutation('SetDomainNameServers')).toHaveBeenCalledWith({ variables: { target: 'CLOUDFLARE', name_servers: null } }),
    );
    expect(ops.notifySuccess).toHaveBeenCalledWith('Nameservers changed for example.test.');
  });

  it('switches back to GoDaddy, and re-checks a pending activation', async () => {
    seed({
      live_provider: 'CLOUDFLARE',
      zone: { id: 'z1', status: 'pending', paused: false, name_servers: ['a.ns.cloudflare.test'], activated_on: null },
    });
    ops.confirm.mockResolvedValue(true);
    await mountNs();
    expect(screen.getByTestId('cloudflare-zone-status')).toHaveTextContent('pending');
    fireEvent.click(screen.getByTestId('cloudflare-recheck'));
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith('Cloudflare is checking the nameservers again.'));
    fireEvent.click(within(screen.getByTestId('cloudflare-provider-switch')).getByRole('switch'));
    await waitFor(() => expect(mutation('SetDomainNameServers')).toHaveBeenCalled());
    expect(mutation('SetDomainNameServers').mock.calls[0][0].variables.target).toBe('GODADDY');
  });

  it('reports a failed re-check and a failed switch', async () => {
    seed({ live_provider: 'CLOUDFLARE', zone: { id: 'z1', status: 'pending', paused: false, name_servers: [], activated_on: null } });
    ops.confirm.mockResolvedValue(true);
    ops.mut.CheckCloudflareActivation = vi.fn().mockRejectedValue(new Error('recheck refused'));
    ops.mut.SetDomainNameServers = vi.fn().mockRejectedValue(new Error('registrar refused'));
    await mountNs();
    fireEvent.click(screen.getByTestId('cloudflare-recheck'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('recheck refused'));
    fireEvent.click(within(screen.getByTestId('cloudflare-provider-switch')).getByRole('switch'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('registrar refused'));
  });

  it('warns when the domain points somewhere else', async () => {
    seed({ live_provider: 'OTHER' });
    await mountNs();
    expect(screen.getByTestId('cloudflare-provider-other')).toBeInTheDocument();
  });

  it('applies a custom nameserver list, normalised and de-duplicated, and rejects bad input', async () => {
    ops.confirm.mockResolvedValue(true);
    await mountNs();
    const box = screen.getByTestId('cloudflare-custom-servers').querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: 'ns1.example.test' } });
    fireEvent.click(screen.getByTestId('cloudflare-custom-submit'));
    expect(await screen.findByText('Enter between 2 and 13 different nameservers.')).toBeInTheDocument();
    fireEvent.change(box, { target: { value: 'NS1.example.test.\nns2.example.test, ns1.example.test, bad host' } });
    fireEvent.click(screen.getByTestId('cloudflare-custom-submit'));
    expect(await screen.findByText(/These are not hostnames/)).toBeInTheDocument();
    fireEvent.change(box, { target: { value: 'NS1.example.test.\nns2.example.test, ns1.example.test' } });
    fireEvent.click(screen.getByTestId('cloudflare-custom-submit'));
    await waitFor(() =>
      expect(mutation('SetDomainNameServers')).toHaveBeenCalledWith({
        variables: { target: 'CUSTOM', name_servers: ['ns1.example.test', 'ns2.example.test'] },
      }),
    );
  });
});
