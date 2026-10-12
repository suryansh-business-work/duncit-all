import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { domainInfo, dnsZone } from '../mocks/dns.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));

import DnsStagingPage from '../../src/pages/domain/staging';
import DomainOverviewPage from '../../src/pages/domain/overview';

beforeEach(() => {
  resetOps();
  ops.q = {
    DnsZone: { data: { dnsZone: dnsZone() } },
    DnsDomainInfo: { data: { dnsDomainInfo: domainInfo() } },
  };
});

const mountStaging = async () => {
  renderWithProviders(<DnsStagingPage />);
  return (await screen.findByTestId('dns-staging-sync-p1')).closest('[role="row"]') as HTMLElement;
};

describe('DNS staging sync', () => {
  it('summarises how far staging is from production', async () => {
    await mountStaging();
    expect(screen.getByTestId('dns-staging-banner')).toHaveTextContent('3 host(s) differ');
    expect(screen.getByTestId('dns-staging-production-count')).toHaveTextContent('3');
    expect(screen.getByTestId('dns-staging-staging-count')).toHaveTextContent('Counts differ');
    expect(screen.getByTestId('dns-staging-missing')).toHaveTextContent('1');
    expect(screen.getByTestId('dns-staging-differing')).toHaveTextContent('2');
    expect(within(screen.getByTestId('dns-staging-type-mx')).getByText('Counts differ')).toBeInTheDocument();
    expect(within(screen.getByTestId('dns-staging-type-ns')).getByText('Not compared')).toBeInTheDocument();
  });

  it('says staging is in sync when nothing differs', async () => {
    const zone = dnsZone();
    ops.q.DnsZone = {
      data: {
        dnsZone: {
          ...zone,
          staging: { ...zone.staging, in_sync: true, production_count: 2, staging_count: 2, pairs: [zone.staging.pairs[0]] },
        },
      },
    };
    await mountStaging();
    expect(screen.getByTestId('dns-staging-banner')).toHaveTextContent('Staging answers for every production host');
    expect(screen.getByTestId('dns-staging-staging-count')).toHaveTextContent('Counts match');
    expect(screen.getByTestId('dns-staging-sync-all')).toBeDisabled();
  });

  it('only offers a sync on fixable rows', async () => {
    await mountStaging();
    expect(screen.getByTestId('dns-staging-sync-p1')).toBeDisabled();
    expect(screen.getByTestId('dns-staging-sync-p4')).toBeDisabled();
    expect(screen.getByTestId('dns-staging-sync-p2')).toBeEnabled();
    expect(screen.getByTestId('dns-staging-sync-all')).toHaveTextContent('Sync all (2)');
  });

  it('syncs one row after the operator confirms, listing the host to be written', async () => {
    ops.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    ops.mut.SyncStagingDns = vi.fn().mockResolvedValue({ data: { syncStagingDns: { synced: 1, failed: 0, outcomes: [] } } });
    await mountStaging();
    fireEvent.click(screen.getByTestId('dns-staging-sync-p2'));
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(ops.confirm.mock.calls[0][0].message).toContain('api-staging.example.test');
    expect(mutation('SyncStagingDns')).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('dns-staging-sync-p2'));
    await waitFor(() => expect(mutation('SyncStagingDns')).toHaveBeenCalledWith({ variables: { ids: ['p2'] } }));
    expect(ops.notifySuccess).toHaveBeenCalledWith('1 staging host(s) now match production.');
  });

  it('syncs every fixable pair at once and reports partial failure with the first reason', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.SyncStagingDns = vi.fn().mockResolvedValue({
      data: {
        syncStagingDns: {
          synced: 1,
          failed: 1,
          outcomes: [
            { id: 'p2', host: 'a', ok: true, message: '' },
            { id: 'p3', host: 'b', ok: false, message: 'record locked' },
          ],
        },
      },
    });
    await mountStaging();
    fireEvent.click(screen.getByTestId('dns-staging-sync-all'));
    await waitFor(() => expect(mutation('SyncStagingDns')).toHaveBeenCalledWith({ variables: { ids: ['p2', 'p3'] } }));
    expect(ops.notifyError).toHaveBeenCalledWith('1 synced, 1 refused by GoDaddy. record locked');
  });

  it('reports a sync that threw', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.SyncStagingDns = vi.fn().mockRejectedValue(new Error('godaddy 500'));
    await mountStaging();
    fireEvent.click(screen.getByTestId('dns-staging-sync-p2'));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('godaddy 500'));
  });

  it('shows the not-configured notice', async () => {
    ops.q.DnsZone = { data: { dnsZone: dnsZone({ configured: false }) } };
    renderWithProviders(<DnsStagingPage />);
    expect(await screen.findByTestId('dns-not-configured')).toBeInTheDocument();
  });
});

describe('Domain overview', () => {
  const mount = () => renderWithProviders(<DomainOverviewPage />);

  it('shows registration, protections, name servers and contacts', async () => {
    mount();
    expect(await screen.findByTestId('domain-days-to-expiry')).toHaveTextContent('200');
    expect(screen.getByTestId('domain-status')).toHaveTextContent('ACTIVE');
    expect(screen.getByTestId('domain-id')).toHaveTextContent('1234');
    expect(within(screen.getByTestId('domain-protection-locked')).getByText('On')).toBeInTheDocument();
    expect(within(screen.getByTestId('domain-protection-transfer-protected')).getByText('Off')).toBeInTheDocument();
    expect(within(screen.getByTestId('domain-protection-expiration-protected')).getByText('Not reported')).toBeInTheDocument();
    expect(within(screen.getByTestId('domain-protection-hold-registrar')).getByText('On')).toBeInTheDocument();
    expect(screen.getByTestId('domain-name-servers')).toHaveTextContent('ns1.example.test');
    expect(screen.getByTestId('domain-contact-registrant')).toHaveTextContent('ops@example.test');
    expect(screen.queryByTestId('domain-expiry-banner')).not.toBeInTheDocument();
  });

  it.each([
    [{ days_to_expiry: -5 }, /expired 5 days ago|has expired/i],
    [{ days_to_expiry: 10 }, /10/],
    [{ days_to_expiry: 60 }, /60/],
    [{ days_to_expiry: 60, renew_auto: false }, /60/],
    [{ days_to_expiry: 200, renew_auto: false }, null],
  ])('warns on the expiry state %j', async (over, banner) => {
    ops.q.DnsDomainInfo = { data: { dnsDomainInfo: domainInfo(over) } };
    mount();
    await screen.findByTestId('domain-days-to-expiry');
    if (banner) expect(screen.getByTestId('domain-expiry-banner')).toHaveTextContent(banner);
    else expect(screen.queryByTestId('domain-expiry-banner')).not.toBeInTheDocument();
  });

  it('warns about missing auto-renew when the expiry is unknown, but not 100 days out', async () => {
    ops.q.DnsDomainInfo = { data: { dnsDomainInfo: domainInfo({ days_to_expiry: null, renew_auto: false }) } };
    const first = mount();
    expect(await screen.findByTestId('domain-expiry-banner')).toBeInTheDocument();
    first.unmount();
    ops.q.DnsDomainInfo = { data: { dnsDomainInfo: domainInfo({ days_to_expiry: 100, renew_auto: false }) } };
    mount();
    await screen.findByTestId('domain-days-to-expiry');
    expect(screen.queryByTestId('domain-expiry-banner')).not.toBeInTheDocument();
  });

  it('degrades gracefully when the registrar reports nothing', async () => {
    ops.q.DnsDomainInfo = {
      data: {
        dnsDomainInfo: domainInfo({
          days_to_expiry: null,
          status: null,
          created_at: null,
          domain_id: null,
          renewable: false,
          name_servers: [],
          contacts: [],
        }),
      },
    };
    mount();
    expect(await screen.findByTestId('domain-status')).toHaveTextContent('—');
    expect(screen.getByTestId('domain-id')).toHaveTextContent('—');
    expect(screen.getByTestId('domain-renewable')).toHaveTextContent('No');
  });

  it('shows the not-configured notice and the query error', async () => {
    ops.q.DnsDomainInfo = { data: { dnsDomainInfo: domainInfo({ configured: false }) } };
    mount();
    expect(await screen.findByTestId('dns-not-configured')).toBeInTheDocument();
  });

  it('shows a failed read', async () => {
    ops.q.DnsDomainInfo = { error: new Error('registrar offline') };
    mount();
    expect(await screen.findByText('registrar offline')).toBeInTheDocument();
  });
});
