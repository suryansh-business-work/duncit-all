import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import SettingsTab from '../../src/pages/cms/settings-tab/SettingsTab';
import { CMS_SITE_DNS, SET_CMS_SITE_A_RECORD } from '../../src/pages/cms/queries/dns';
import { CMS_FRAGMENT_OPTIONS } from '../../src/pages/cms/queries/fragments';
import { DELETE_CMS_SITE, UPDATE_CMS_SITE } from '../../src/pages/cms/queries/sites';
import { renderWithProviders } from '../testkit';
import { en, label } from '../en';
import { makeCmsSiteRow } from '../mocks/cms.mock';
import { answerQuery, mutationOf, resetApollo } from '../hooks-mock';

const confirm = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('../hooks-mock')).hooks,
}));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  useConfirm: () => confirm,
}));

const SITE = makeCmsSiteRow({ id: 'site-1', key: 'main', name: 'Main site', domains: ['duncit.com', 'www.duncit.com'] });

const DNS = {
  configured: true,
  zone: 'duncit.com',
  hosts: [
    { __typename: 'CmsSiteDnsHost', host: 'duncit.com', name: '@', in_zone: true, records: [{ id: 'a1', type: 'A', data: '10.0.0.1', ttl: 600 }, { id: 'c1', type: 'TXT', data: 'v=spf1', ttl: 600 }] },
    { __typename: 'CmsSiteDnsHost', host: 'www.duncit.com', name: 'www', in_zone: true, records: [] },
    { __typename: 'CmsSiteDnsHost', host: 'other.example', name: '', in_zone: false, records: [] },
  ],
};

const mount = (onSaved = vi.fn()) => {
  renderWithProviders(<SettingsTab site={SITE} onSaved={onSaved} />, {
    initialEntries: ['/sites/site-1'],
    routes: (
      <>
        <Route path="/sites/site-1" element={<SettingsTab site={SITE} onSaved={onSaved} />} />
        <Route path="/sites" element={<div data-testid="sites-route" />} />
      </>
    ),
  });
  return onSaved;
};

beforeEach(() => {
  resetApollo();
  confirm.mockReset();
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
  answerQuery(CMS_FRAGMENT_OPTIONS, { data: { cmsFragments: [] } });
  answerQuery(CMS_SITE_DNS, { data: { cmsSiteDns: DNS } });
});

describe('SettingsTab', () => {
  it('saves the site form and tells the workspace to refresh', async () => {
    const onSaved = mount();
    const name = screen.getByLabelText(label('websiteApp.cms.site.name'));
    expect(name).toHaveValue('Main site');
    fireEvent.change(name, { target: { value: 'Main website' } });
    fireEvent.click(screen.getByTestId('cms-site-save'));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(mutationOf(UPDATE_CMS_SITE).mock.calls[0][0]?.variables).toMatchObject({
      id: 'site-1',
      input: { key: 'main', name: 'Main website', domains: ['duncit.com', 'www.duncit.com'] },
    });
    expect(notifySuccess).toHaveBeenCalledWith(en('websiteApp.cms.site.saved'));
  });

  it('shows the generic line for an unexpected save failure', async () => {
    mutationOf(UPDATE_CMS_SITE).mockRejectedValue(new Error('socket hang up'));
    const onSaved = mount();
    fireEvent.click(screen.getByTestId('cms-site-save'));
    expect(await screen.findByText(en('websiteApp.cms.site.saveFailed'))).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('deletes the website after confirmation and returns to the list', async () => {
    confirm.mockResolvedValue(true);
    mount();
    fireEvent.click(screen.getAllByRole('button', { name: en('shell.common.delete') }).at(-1) as HTMLElement);
    await waitFor(() => expect(mutationOf(DELETE_CMS_SITE)).toHaveBeenCalledWith({ variables: { id: 'site-1' } }));
    expect(confirm.mock.calls[0][0]).toMatchObject({ message: en('websiteApp.cms.site.deleteText', { name: 'Main site' }), destructive: true });
    expect(await screen.findByTestId('sites-route')).toBeInTheDocument();
  });

  it('keeps the website when the operator declines, and explains a refused delete', async () => {
    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mutationOf(DELETE_CMS_SITE).mockRejectedValue({
      message: 'x',
      errors: [{ message: 'The site still has pages', extensions: { code: 'BAD_USER_INPUT' } }],
    });
    mount();
    const del = () => screen.getAllByRole('button', { name: en('shell.common.delete') }).at(-1) as HTMLElement;
    fireEvent.click(del());
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(mutationOf(DELETE_CMS_SITE)).not.toHaveBeenCalled();
    fireEvent.click(del());
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('The site still has pages'));
    expect(screen.queryByTestId('sites-route')).not.toBeInTheDocument();
  });
});

describe('DnsPanel', () => {
  it('lists every hostname with its records and where it is not managed', () => {
    mount();
    const apex = screen.getByTestId('cms-dns-host-duncit.com');
    expect(within(apex).getByText('10.0.0.1')).toBeInTheDocument();
    expect(within(apex).getByText('v=spf1')).toBeInTheDocument();
    expect(within(screen.getByTestId('cms-dns-host-www.duncit.com')).getByText(en('websiteApp.cms.dns.noRecords'))).toBeInTheDocument();
    const outside = screen.getByTestId('cms-dns-host-other.example');
    expect(within(outside).getByText(en('websiteApp.cms.dns.outOfZone'))).toBeInTheDocument();
    expect(within(outside).queryByRole('button')).not.toBeInTheDocument();
    // Only an A record can be repointed.
    expect(within(apex).getAllByRole('button', { name: new RegExp(en('websiteApp.cms.dns.repoint')) })).toHaveLength(1);
  });

  it('tells the editor when no DNS provider is connected', () => {
    answerQuery(CMS_SITE_DNS, { data: { cmsSiteDns: { configured: false, zone: '', hosts: [] } } });
    mount();
    expect(screen.getByText(en('websiteApp.cms.dns.notConfigured'))).toBeInTheDocument();
    expect(screen.queryByTestId('cms-dns-host-duncit.com')).not.toBeInTheDocument();
  });

  it('says nothing is managed when the zone has no hostnames', () => {
    answerQuery(CMS_SITE_DNS, { data: { cmsSiteDns: { configured: true, zone: 'duncit.com', hosts: [] } } });
    mount();
    expect(screen.getByText(en('websiteApp.cms.dns.noDomains'))).toBeInTheDocument();
  });

  it('explains a missing permission without offering retry', () => {
    answerQuery(CMS_SITE_DNS, { error: Object.assign(new Error('no'), { errors: [{ message: 'no', extensions: { code: 'FORBIDDEN' } }] }) });
    mount();
    expect(screen.getByText(en('websiteApp.cms.dns.forbidden'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: en('shell.common.retry') })).not.toBeInTheDocument();
  });

  it('offers retry after a failed read', () => {
    const refetch = answerQuery(CMS_SITE_DNS, { error: new Error('timeout') });
    mount();
    expect(screen.getByText(en('websiteApp.cms.dns.loadFailed'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en('shell.common.retry') }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('ARecordDialog', () => {
  const openRepoint = () => {
    fireEvent.click(screen.getByRole('button', { name: new RegExp(en('websiteApp.cms.dns.repoint')) }));
    return screen.findByRole('dialog');
  };

  it('repoints an A record, keeping its current address and TTL in the request', async () => {
    const refetch = answerQuery(CMS_SITE_DNS, { data: { cmsSiteDns: DNS } });
    mount();
    const dialog = await openRepoint();
    expect(within(dialog).getByLabelText(label('websiteApp.cms.dns.ip'))).toHaveValue('10.0.0.1');
    fireEvent.change(within(dialog).getByLabelText(label('websiteApp.cms.dns.ip')), { target: { value: ' 10.0.0.9 ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: en('shell.common.save') }));
    await waitFor(() => expect(mutationOf(SET_CMS_SITE_A_RECORD)).toHaveBeenCalled());
    expect(mutationOf(SET_CMS_SITE_A_RECORD).mock.calls[0][0]?.variables).toEqual({
      siteId: 'site-1',
      input: { host: 'duncit.com', ip: '10.0.0.9', ttl: 600, current: '10.0.0.1' },
    });
    expect(notifySuccess).toHaveBeenCalledWith(en('websiteApp.cms.dns.saved', { host: 'duncit.com' }));
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('adds a record for a hostname with none, and refuses a malformed address', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: `${en('websiteApp.cms.dns.add')}: www.duncit.com` }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText(label('websiteApp.cms.dns.ip'))).toHaveValue('');
    fireEvent.change(within(dialog).getByLabelText(label('websiteApp.cms.dns.ip')), { target: { value: '999.1.1.1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: en('shell.common.save') }));
    expect(await within(dialog).findByText(en('websiteApp.cms.dns.errIp'))).toBeInTheDocument();
    expect(mutationOf(SET_CMS_SITE_A_RECORD)).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText(label('websiteApp.cms.dns.ip')), { target: { value: '10.1.1.1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: en('shell.common.save') }));
    await waitFor(() => expect(mutationOf(SET_CMS_SITE_A_RECORD).mock.calls[0][0]?.variables).toEqual({
      siteId: 'site-1',
      input: { host: 'www.duncit.com', ip: '10.1.1.1', ttl: null, current: null },
    }));
  });

  it('keeps the dialog and shows why when the DNS provider refuses', async () => {
    mutationOf(SET_CMS_SITE_A_RECORD).mockRejectedValue(new Error('GoDaddy 500'));
    mount();
    const dialog = await openRepoint();
    fireEvent.click(within(dialog).getByRole('button', { name: en('shell.common.save') }));
    expect(await within(dialog).findByText(en('websiteApp.cms.dns.saveFailed'))).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: en('shell.common.cancel') }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
