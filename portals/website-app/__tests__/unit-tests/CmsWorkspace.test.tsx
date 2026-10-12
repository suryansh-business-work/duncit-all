import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import SiteWorkspacePage from '../../src/pages/cms/workspace/SiteWorkspacePage';
import { CMS_SITE } from '../../src/pages/cms/queries/sites';
import { CMS_SITE_REVISIONS, RESTORE_CMS_SITE_REVISION } from '../../src/pages/cms/queries/revisions';
import { renderWithProviders } from '../testkit';
import { en } from '../en';
import { makeCmsSiteRow } from '../mocks/cms.mock';
import { answerQuery, mutationOf, queryOptions, resetApollo } from '../hooks-mock';

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

// Each tab body is proven on its own; here only which one the workspace picks.
vi.mock('../../src/pages/cms/pages-tab/PagesTab', () => ({ default: ({ site }: { site: { name: string } }) => <div data-testid="tab-pages">{site.name}</div> }));
vi.mock('../../src/pages/cms/fragments-tab/FragmentsTab', () => ({ default: () => <div data-testid="tab-fragments" /> }));
vi.mock('../../src/pages/cms/collection-tab/CollectionTab', () => ({ default: ({ collection }: { collection: string }) => <div data-testid="tab-collection">{collection}</div> }));
vi.mock('../../src/pages/cms/design-tab/DesignTab', () => ({ default: ({ siteId }: { siteId: string }) => <div data-testid="tab-design">{siteId}</div> }));
vi.mock('../../src/pages/cms/code-tab/CodeTab', () => ({ default: () => <div data-testid="tab-code" /> }));
vi.mock('../../src/pages/cms/settings-tab/SettingsTab', () => ({
  default: ({ onSaved }: { onSaved: () => void }) => (
    <button type="button" data-testid="tab-settings" onClick={onSaved}>
      settings
    </button>
  ),
}));

const SITE = makeCmsSiteRow({ id: 'site-1', name: 'Main site', domains: ['duncit.com'], collections: ['BLOG', 'CASE_STUDY'] });

const mount = (search = '') =>
  renderWithProviders(<SiteWorkspacePage />, {
    initialEntries: [`/sites/site-1${search}`],
    routes: <Route path="/sites/:siteId" element={<SiteWorkspacePage />} />,
  });

const REVISIONS = [
  { __typename: 'CmsSiteRevision', id: 'rv3', revision: 3, section: 'DESIGN', restored_from: null, created_at: '2026-10-03T10:00:00.000Z' },
  { __typename: 'CmsSiteRevision', id: 'rv2', revision: 2, section: 'CODE', restored_from: 1, created_at: '2026-10-02T10:00:00.000Z' },
];

beforeEach(() => {
  resetApollo();
  confirm.mockReset();
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
});

describe('SiteWorkspacePage', () => {
  it('opens on pages, with a tab for each enabled collection, and a live link', () => {
    answerQuery(CMS_SITE, { data: { cmsSite: SITE } });
    mount();
    expect(screen.getByTestId('tab-pages')).toHaveTextContent('Main site');
    for (const name of ['pages', 'fragments', 'design', 'code', 'settings']) {
      expect(screen.getByRole('tab', { name: en(`websiteApp.cms.tabs.${name}`) })).toBeInTheDocument();
    }
    expect(screen.getByRole('tab', { name: en('websiteApp.cms.collection.blog') })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: en('websiteApp.cms.collection.caseStudy') })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: en('websiteApp.cms.collection.career') })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: new RegExp(en('websiteApp.cms.viewLive')) })).toHaveAttribute('href', 'https://duncit.com');
    expect(queryOptions.get(CMS_SITE)?.variables).toEqual({ id: 'site-1' });
  });

  it.each([
    ['design', 'tab-design'],
    ['code', 'tab-code'],
    ['fragments', 'tab-fragments'],
    ['blog', 'tab-collection'],
  ])('shows the %s body for ?selectedtab=%s', (tab, testId) => {
    answerQuery(CMS_SITE, { data: { cmsSite: SITE } });
    mount(`?selectedtab=${tab}`);
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it('maps the case-studies slug to its collection and refreshes the site after a settings save', () => {
    const refetch = answerQuery(CMS_SITE, { data: { cmsSite: SITE } });
    mount('?selectedtab=case-studies');
    expect(screen.getByTestId('tab-collection')).toHaveTextContent('CASE_STUDY');
    fireEvent.click(screen.getByRole('tab', { name: en('websiteApp.cms.tabs.settings') }));
    fireEvent.click(screen.getByTestId('tab-settings'));
    expect(refetch).toHaveBeenCalled();
  });

  it('has no live link for a site without a domain', () => {
    answerQuery(CMS_SITE, { data: { cmsSite: makeCmsSiteRow({ domains: [], name: 'Draft site' }) } });
    mount();
    expect(screen.queryByRole('link', { name: new RegExp(en('websiteApp.cms.viewLive')) })).not.toBeInTheDocument();
    expect(screen.getByText(en('websiteApp.cms.noDomain'))).toBeInTheDocument();
  });

  it('says so for a missing site, a failed read, and shows no body while loading', () => {
    answerQuery(CMS_SITE, { data: { cmsSite: null } });
    const first = mount();
    expect(screen.getByText(en('websiteApp.cms.notFound'))).toBeInTheDocument();
    first.unmount();
    answerQuery(CMS_SITE, { error: new Error('x') });
    const second = mount();
    expect(screen.getByText(en('websiteApp.cms.loadFailed'))).toBeInTheDocument();
    second.unmount();
    answerQuery(CMS_SITE, { loading: true });
    mount();
    expect(screen.queryByTestId('tab-pages')).not.toBeInTheDocument();
  });
});

describe('SiteRevisionsDialog', () => {
  const open = async () => {
    answerQuery(CMS_SITE, { data: { cmsSite: SITE } });
    answerQuery(CMS_SITE_REVISIONS, { data: { cmsSiteRevisions: REVISIONS } });
    mount();
    fireEvent.click(screen.getByTestId('cms-site-revisions'));
    return screen.findByRole('dialog');
  };

  it('lists saved states, marking the latest and where a restore came from', async () => {
    const dialog = await open();
    expect(within(dialog).getByText(en('websiteApp.cms.revisions.latest'))).toBeInTheDocument();
    expect(within(dialog).getByText(new RegExp(en('websiteApp.cms.revisions.restoredFrom', { revision: 1 })))).toBeInTheDocument();
    expect(queryOptions.get(CMS_SITE_REVISIONS)?.variables).toEqual({ siteId: 'site-1', section: null });
  });

  it('narrows the list to one section', async () => {
    const dialog = await open();
    fireEvent.mouseDown(within(dialog).getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: en('websiteApp.cms.revisions.code') }));
    await waitFor(() => expect(queryOptions.get(CMS_SITE_REVISIONS)?.variables).toEqual({ siteId: 'site-1', section: 'CODE' }));
  });

  it('restores a revision only after confirming, then says which one', async () => {
    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const dialog = await open();
    const restore = within(dialog).getAllByRole('button', { name: new RegExp(en('websiteApp.cms.revisions.restore')) })[0];
    fireEvent.click(restore);
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(mutationOf(RESTORE_CMS_SITE_REVISION)).not.toHaveBeenCalled();
    fireEvent.click(restore);
    await waitFor(() => expect(mutationOf(RESTORE_CMS_SITE_REVISION)).toHaveBeenCalledWith({ variables: { id: 'rv3' } }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith(en('websiteApp.cms.revisions.restored', { revision: 3 })));
  });

  it('reports a refused restore with the server sentence when it is meant for the editor', async () => {
    confirm.mockResolvedValue(true);
    mutationOf(RESTORE_CMS_SITE_REVISION).mockRejectedValue({
      message: 'x',
      errors: [{ message: 'That revision is gone', extensions: { code: 'NOT_FOUND' } }],
    });
    const dialog = await open();
    fireEvent.click(within(dialog).getAllByRole('button', { name: new RegExp(en('websiteApp.cms.revisions.restore')) })[1]);
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('That revision is gone'));
  });

  it('shows the empty and failed states', async () => {
    answerQuery(CMS_SITE, { data: { cmsSite: SITE } });
    answerQuery(CMS_SITE_REVISIONS, { data: { cmsSiteRevisions: [] } });
    mount();
    fireEvent.click(screen.getByTestId('cms-site-revisions'));
    expect(await screen.findByText(en('websiteApp.cms.revisions.empty'))).toBeInTheDocument();
  });
});
