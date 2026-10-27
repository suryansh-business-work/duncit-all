import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { dnsZone, domainInfo } from '../mocks/dns.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));

import DnsRecordsPage from '../../src/pages/domain/dns-records';
import DomainOverviewPage from '../../src/pages/domain/overview';
import DnsStagingPage from '../../src/pages/domain/staging';
import TypeCountsCard from '../../src/pages/domain/staging/TypeCountsCard';
import { blankRecord, dnsRecordSchema } from '../../src/pages/domain/dns-records/dns-record/dns-record.types';

beforeEach(() => {
  resetOps();
  ops.q = {
    DnsZone: { data: { dnsZone: dnsZone() } },
    DnsDomainInfo: { data: { dnsDomainInfo: domainInfo() } },
  };
});

describe('Domain pages / loading', () => {
  it.each([
    ['records', <DnsRecordsPage key="r" />],
    ['staging', <DnsStagingPage key="s" />],
  ])('keeps the %s page content while the zone refreshes', async (_name, page) => {
    ops.q.DnsZone = { loading: true, data: { dnsZone: dnsZone() } };
    renderWithProviders(page);
    expect(await screen.findByRole('grid')).toBeInTheDocument();
  });

  it('waits for the first answer on the records and staging pages', () => {
    ops.q.DnsZone = { loading: true };
    const { unmount } = renderWithProviders(<DnsRecordsPage />);
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<DnsStagingPage />);
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('keeps the overview while the registration refreshes, and waits for the first answer', async () => {
    ops.q.DnsDomainInfo = { loading: true, data: { dnsDomainInfo: domainInfo() } };
    const { unmount } = renderWithProviders(<DomainOverviewPage />);
    expect(await screen.findByTestId('domain-name')).toBeInTheDocument();
    unmount();

    ops.q.DnsDomainInfo = { loading: true };
    renderWithProviders(<DomainOverviewPage />);
    expect(screen.queryByTestId('domain-name')).not.toBeInTheDocument();
  });
});

describe('Domain overview / edges', () => {
  it('shows a dash for a registration with no domain name', async () => {
    ops.q.DnsDomainInfo = { data: { dnsDomainInfo: domainInfo({ domain: '' }) } };
    renderWithProviders(<DomainOverviewPage />);
    expect(await screen.findByTestId('domain-name')).toHaveTextContent('—');
  });

  it('reads a registrar hold as a missing protection when it is on, and says nothing when unknown', async () => {
    ops.q.DnsDomainInfo = { data: { dnsDomainInfo: domainInfo({ hold_registrar: true }) } };
    const { unmount } = renderWithProviders(<DomainOverviewPage />);
    await screen.findByTestId('domain-name');
    const holdOn = document.body.innerHTML;
    unmount();

    ops.q.DnsDomainInfo = { data: { dnsDomainInfo: domainInfo({ hold_registrar: null }) } };
    renderWithProviders(<DomainOverviewPage />);
    await screen.findByTestId('domain-name');

    expect(document.body.innerHTML).not.toBe(holdOn);
  });
});

describe('DNS records / writes refused with text', () => {
  it('finds a record by its type, name or value', async () => {
    renderWithProviders(<DnsRecordsPage />);
    await screen.findByText('api', { selector: 'p' });

    fireEvent.change(screen.getByPlaceholderText(/^Search/), { target: { value: 'mail.example' } });

    await waitFor(() => expect(screen.queryByText('api', { selector: 'p' })).not.toBeInTheDocument());
    expect(screen.getByText('mail.example.test')).toBeInTheDocument();
  });

  it('uses the plain-language message when a save and a delete are refused without an Error', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.UpdateDnsRecord = vi.fn().mockRejectedValue('no');
    ops.mut.DeleteDnsRecord = vi.fn().mockRejectedValue('no');
    renderWithProviders(<DnsRecordsPage />);
    const row = (await screen.findByText('api', { selector: 'p' })).closest('[role="row"]') as HTMLElement;

    fireEvent.click(within(row).getByRole('button', { name: 'Edit' }));
    fireEvent.click(await screen.findByTestId('dns-record-save'));
    const message = await screen.findByTestId('dns-record-error');
    expect(message.textContent).not.toBe('no');
    expect(message.textContent).not.toBe('');
    fireEvent.keyDown(screen.getByTestId('dns-record-dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('dns-record-dialog')).not.toBeInTheDocument());

    fireEvent.click(within(row).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledTimes(1));
    expect(ops.notifyError.mock.calls[0][0]).not.toBe('no');
  });
});

describe('DNS record schema', () => {
  const rules = { domain: 'example.test', min_ttl: 600, max_ttl: 86400, writable_types: ['A', 'AAAA', 'TXT'] } as never;
  const messages = {
    nameInvalid: 'name',
    nameIsRelative: 'relative',
    valueRequired: 'value',
    ttlRange: 'ttl',
    priorityRange: 'priority',
    ipv4: 'ipv4',
    ipv6: 'ipv6',
  } as never;
  const schema = dnsRecordSchema(rules, messages);
  const base = { type: 'AAAA', name: 'www', data: '2001:db8::1', ttl: 600, priority: 10 };
  const issues = (values: unknown) => (schema.safeParse(values).error?.issues ?? []).map((issue) => issue.message);

  it('accepts an IPv6 address on an AAAA record and refuses anything else there', () => {
    expect(schema.safeParse(base).success).toBe(true);
    expect(issues({ ...base, data: '203.0.113.10' })).toEqual(['ipv6']);
    expect(issues({ ...base, data: 'not-an-address' })).toEqual(['ipv6']);
  });

  it('does not hold a TXT record to an address shape', () => {
    expect(schema.safeParse({ ...base, type: 'TXT', data: 'v=spf1 -all' }).success).toBe(true);
  });

  it('opens a new record on the tab it was added from when GoDaddy writes that type, and the first type otherwise', () => {
    const zone = { writable_types: ['A', 'TXT'], min_ttl: 600 };
    expect(blankRecord(zone, 'TXT').type).toBe('TXT');
    expect(blankRecord(zone, 'NS').type).toBe('A');
    expect(blankRecord(zone, null).type).toBe('A');
  });

  it('opens on no type for a zone that allows none to be written', () => {
    expect(blankRecord({ writable_types: [], min_ttl: 600 }, 'A').type).toBe('');
  });
});

describe('DNS staging / edges', () => {
  it('shows the read error', async () => {
    ops.q.DnsZone = { error: new Error('godaddy unreachable') };
    renderWithProviders(<DnsStagingPage />);
    expect(await screen.findByText('godaddy unreachable')).toBeInTheDocument();
  });

  it('shows the not-configured notice for a zone without credentials', async () => {
    ops.q.DnsZone = { data: { dnsZone: dnsZone({ configured: false }) } };
    renderWithProviders(<DnsStagingPage />);
    expect(await screen.findByTestId('dns-not-configured')).toBeInTheDocument();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('shows no warning colour when staging misses and differs on nothing', async () => {
    const zone = dnsZone();
    ops.q.DnsZone = {
      data: {
        dnsZone: {
          ...zone,
          staging: { ...zone.staging, missing_staging: 0, differs: 0, missing_production: 0, in_sync: true, pairs: [zone.staging.pairs[0]] },
        },
      },
    };
    renderWithProviders(<DnsStagingPage />);
    expect(await screen.findByTestId('dns-staging-missing')).toHaveTextContent('0');
    expect(screen.getByTestId('dns-staging-differing')).toHaveTextContent('0');
  });

  it('finds a host by what either stack answers for it', async () => {
    renderWithProviders(<DnsStagingPage />);
    await screen.findByTestId('dns-staging-sync-p2');

    fireEvent.change(screen.getByPlaceholderText(/^Search/), { target: { value: '198.51.100.1' } });

    await waitFor(() => expect(screen.queryByTestId('dns-staging-sync-p2')).not.toBeInTheDocument());
    expect(screen.getByTestId('dns-staging-sync-p3')).toBeInTheDocument();
  });

  it('says there are no records when the zone has none', () => {
    renderWithProviders(<TypeCountsCard byType={[]} pairedTypes={[]} />);
    expect(screen.getByText('No records in this zone.', { exact: false })).toBeInTheDocument();
  });

  it('names the host when GoDaddy refused a sync without a reason, and reads a clean sync as done', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.SyncStagingDns = vi
      .fn()
      .mockResolvedValueOnce({
        data: { syncStagingDns: { synced: 0, failed: 1, outcomes: [{ id: 'p2', host: 'www-staging.example.test', ok: false, message: null }] } },
      })
      .mockResolvedValueOnce({ data: { syncStagingDns: { synced: 1, failed: 0, outcomes: [] } } })
      .mockResolvedValueOnce({ data: {} })
      .mockRejectedValueOnce('no');
    renderWithProviders(<DnsStagingPage />);
    const sync = await screen.findByTestId('dns-staging-sync-p2');

    fireEvent.click(sync);
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith(expect.stringContaining('www-staging.example.test')));
    fireEvent.click(sync);
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledTimes(1));
    fireEvent.click(sync);
    await waitFor(() => expect(mutation('SyncStagingDns')).toHaveBeenCalledTimes(3));
    expect(ops.notifySuccess).toHaveBeenCalledTimes(1);
    fireEvent.click(sync);
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledTimes(2));
    expect(ops.notifyError.mock.calls[1][0]).not.toBe('no');
  });
});
