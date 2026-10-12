import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { dnsZone } from '../mocks/dns.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));

import DnsRecordsPage from '../../src/pages/domain/dns-records';

const seed = (over: Record<string, unknown> = {}) => {
  ops.q = { DnsZone: { data: { dnsZone: dnsZone(over) } } };
};

beforeEach(() => {
  resetOps();
  seed();
});

const mount = async () => {
  renderWithProviders(<DnsRecordsPage />);
  return (await screen.findByText('api', { selector: 'p' })).closest('[role="row"]') as HTMLElement;
};

describe('DNS records page', () => {
  it('lists every record with its scope and host, and counts per type tab', async () => {
    const row = await mount();
    expect(within(row).getByText('api.example.test')).toBeInTheDocument();
    expect(within(row).getByText('203.0.113.10')).toBeInTheDocument();
    expect(screen.getByTestId('dns-type-tab-all')).toHaveTextContent('All · 4');
    expect(screen.getByTestId('dns-type-tab-mx')).toHaveTextContent('MX · 1');
  });

  it('narrows to one type from its tab', async () => {
    await mount();
    fireEvent.click(screen.getByTestId('dns-type-tab-mx'));
    await waitFor(() => expect(screen.queryByText('api', { selector: 'p' })).not.toBeInTheDocument());
    expect(await screen.findByText('mail.example.test')).toBeInTheDocument();
  });

  it('shows the not-configured notice for a zone without credentials', async () => {
    seed({ configured: false });
    renderWithProviders(<DnsRecordsPage />);
    expect(await screen.findByTestId('dns-not-configured')).toBeInTheDocument();
  });

  it('shows the query error', async () => {
    ops.q.DnsZone = { error: new Error('godaddy unreachable') };
    renderWithProviders(<DnsRecordsPage />);
    expect(await screen.findByText('godaddy unreachable')).toBeInTheDocument();
  });

  it('locks edit and delete on records GoDaddy owns', async () => {
    await mount();
    const row = (await screen.findByText('ns1.example.test')).closest('[role="row"]') as HTMLElement;
    for (const button of within(row).getAllByRole('button')) expect(button).toBeDisabled();
  });
});

describe('DNS record dialog', () => {
  const openAdd = async () => {
    await mount();
    fireEvent.click(screen.getByTestId('dns-add-record'));
    return screen.findByTestId('dns-record-dialog');
  };

  it('adds an A record and reports success', async () => {
    const dialog = await openAdd();
    fireEvent.change(within(dialog).getByTestId('dns-record-name').querySelector('input') as HTMLElement, { target: { value: 'WWW' } });
    fireEvent.change(within(dialog).getByTestId('dns-record-value').querySelector('input') as HTMLElement, { target: { value: '203.0.113.20' } });
    fireEvent.click(within(dialog).getByTestId('dns-record-save'));
    await waitFor(() => expect(mutation('AddDnsRecord')).toHaveBeenCalled());
    expect(mutation('AddDnsRecord').mock.calls[0][0].variables.input).toEqual({
      type: 'A',
      name: 'www',
      data: '203.0.113.20',
      ttl: 600,
      priority: null,
    });
    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledWith('Saved'));
  });

  it('refuses an invalid IPv4, a name that repeats the zone and an out-of-range TTL', async () => {
    const dialog = await openAdd();
    fireEvent.change(within(dialog).getByTestId('dns-record-name').querySelector('input') as HTMLElement, { target: { value: 'www.example.test' } });
    fireEvent.change(within(dialog).getByTestId('dns-record-value').querySelector('input') as HTMLElement, { target: { value: '999.1.1.1' } });
    fireEvent.change(within(dialog).getByTestId('dns-record-ttl').querySelector('input') as HTMLElement, { target: { value: '60' } });
    fireEvent.click(within(dialog).getByTestId('dns-record-save'));
    expect(await within(dialog).findByText('Leave out .example.test — it is added for you.')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter an IPv4 address, e.g. 203.0.113.10.')).toBeInTheDocument();
    expect(mutation('AddDnsRecord')).not.toHaveBeenCalled();
  });

  it('asks for a priority only for MX and sends null for the other types', async () => {
    await mount();
    fireEvent.click(screen.getByTestId('dns-type-tab-mx'));
    fireEvent.click(await screen.findByTestId('dns-add-record'));
    const dialog = await screen.findByTestId('dns-record-dialog');
    expect(within(dialog).getByTestId('dns-record-priority')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByTestId('dns-record-name').querySelector('input') as HTMLElement, { target: { value: 'mail' } });
    fireEvent.change(within(dialog).getByTestId('dns-record-value').querySelector('input') as HTMLElement, { target: { value: 'mx.example.test' } });
    fireEvent.click(within(dialog).getByTestId('dns-record-save'));
    await waitFor(() => expect(mutation('AddDnsRecord')).toHaveBeenCalled());
    expect(mutation('AddDnsRecord').mock.calls[0][0].variables.input).toMatchObject({ type: 'MX', priority: 10 });
  });

  it('edits an existing record by its original reference and shows a server error', async () => {
    ops.mut.UpdateDnsRecord = vi.fn().mockRejectedValue(new Error('GoDaddy refused the change'));
    const row = await mount();
    fireEvent.click(within(row).getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByTestId('dns-record-dialog');
    expect(within(dialog).getByTestId('dns-record-name').querySelector('input')).toBeDisabled();
    fireEvent.change(within(dialog).getByTestId('dns-record-value').querySelector('input') as HTMLElement, { target: { value: '203.0.113.99' } });
    fireEvent.click(within(dialog).getByTestId('dns-record-save'));
    expect(await within(dialog).findByTestId('dns-record-error')).toHaveTextContent('GoDaddy refused the change');
    expect(ops.mut.UpdateDnsRecord.mock.calls[0][0].variables).toEqual({
      ref: { type: 'A', name: 'api', data: '203.0.113.10' },
      input: { type: 'A', name: 'api', data: '203.0.113.99', ttl: 600, priority: null },
    });
  });

  it('deletes after confirmation and reports a failed delete', async () => {
    ops.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    const row = await mount();
    const del = within(row).getByRole('button', { name: 'Delete' });
    fireEvent.click(del);
    await waitFor(() => expect(ops.confirm).toHaveBeenCalledTimes(1));
    expect(mutation('DeleteDnsRecord')).not.toHaveBeenCalled();
    fireEvent.click(del);
    await waitFor(() =>
      expect(mutation('DeleteDnsRecord')).toHaveBeenCalledWith({
        variables: { ref: { type: 'A', name: 'api', data: '203.0.113.10' } },
      }),
    );
    expect(ops.notifySuccess).toHaveBeenCalledWith('Deleted');
    mutation('DeleteDnsRecord').mockRejectedValueOnce(new Error('record is locked'));
    fireEvent.click(del);
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('record is locked'));
  });
});
