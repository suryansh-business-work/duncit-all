import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import SitesPage from '../../src/pages/cms/sites/SitesPage';
import { CMS_SITES, CREATE_CMS_SITE } from '../../src/pages/cms/queries/sites';
import { renderWithProviders } from '../testkit';
import { en, label } from '../en';
import { makeCmsSiteRow } from '../mocks/cms.mock';
import { answerQuery, mutationOf, resetApollo } from '../hooks-mock';

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('../hooks-mock')).hooks,
}));

const SITES = [
  makeCmsSiteRow({ id: 's1', key: 'main', name: 'Main site', domains: ['duncit.com', 'www.duncit.com'], page_count: 7 }),
  makeCmsSiteRow({ id: 's2', key: 'ads', name: 'Ads site', domains: [], is_active: false, page_count: 1 }),
];

const mount = () =>
  renderWithProviders(<SitesPage />, {
    initialEntries: ['/'],
    routes: (
      <>
        <Route path="/" element={<SitesPage />} />
        <Route path="/sites/:siteId" element={<div data-testid="workspace-route" />} />
      </>
    ),
  });

beforeEach(() => {
  resetApollo();
});

describe('SitesPage', () => {
  it('lists each website with its domains, state and page count', () => {
    answerQuery(CMS_SITES, { data: { cmsSites: SITES } });
    mount();
    const main = screen.getByTestId('cms-site-main');
    expect(main).toHaveTextContent('Main site');
    expect(main).toHaveTextContent('duncit.com, www.duncit.com');
    expect(main).toHaveTextContent(en('websiteApp.cms.pageCount', { count: 7 }));
    expect(main).toHaveTextContent(en('shell.common.active'));
    const ads = screen.getByTestId('cms-site-ads');
    expect(ads).toHaveTextContent(en('websiteApp.cms.noDomain'));
    expect(ads).toHaveTextContent(en('shell.common.inactive'));
    expect(main).toHaveAttribute('href', '/sites/s1');
  });

  it('shows the empty state, a failed read and no list while loading', () => {
    answerQuery(CMS_SITES, { data: { cmsSites: [] } });
    const first = mount();
    expect(screen.getByTestId('cms-no-sites')).toBeInTheDocument();
    first.unmount();

    answerQuery(CMS_SITES, { error: new Error('down') });
    const second = mount();
    expect(screen.getByText(en('websiteApp.cms.loadFailed'))).toBeInTheDocument();
    expect(screen.queryByTestId('cms-no-sites')).not.toBeInTheDocument();
    second.unmount();

    answerQuery(CMS_SITES, { loading: true });
    mount();
    expect(screen.queryByTestId('cms-no-sites')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cms-site-main')).not.toBeInTheDocument();
  });

  it('creates a website from the dialog and opens its workspace', async () => {
    const refetch = answerQuery(CMS_SITES, { data: { cmsSites: [] } });
    mutationOf(CREATE_CMS_SITE).mockResolvedValue({ data: { createCmsSite: { id: 'new-site' } } });
    mount();
    fireEvent.click(screen.getByTestId('cms-new-site'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByTestId('cms-site-save'));
    // The required identity fields are named in the errors, and nothing is sent.
    expect(await within(dialog).findByText(en('websiteApp.cms.site.errName'))).toBeInTheDocument();
    expect(mutationOf(CREATE_CMS_SITE)).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText(label('websiteApp.cms.site.name')), { target: { value: 'Brand site' } });
    fireEvent.change(within(dialog).getByLabelText(label('websiteApp.cms.site.key')), { target: { value: 'brand' } });
    fireEvent.change(within(dialog).getByLabelText(label('websiteApp.cms.site.domains')), { target: { value: 'brand.test, www.brand.test' } });
    fireEvent.click(within(dialog).getByTestId('cms-site-save'));

    expect(await screen.findByTestId('workspace-route')).toBeInTheDocument();
    const input = mutationOf(CREATE_CMS_SITE).mock.calls[0][0]?.variables?.input as Record<string, unknown>;
    expect(input).toMatchObject({ key: 'brand', name: 'Brand site', domains: ['brand.test', 'www.brand.test'], legacy_site: null, is_active: true });
    expect(refetch).toHaveBeenCalled();
  });

  it('closes the new-website dialog on Cancel and on Escape without creating anything', async () => {
    answerQuery(CMS_SITES, { data: { cmsSites: [] } });
    mount();
    fireEvent.click(screen.getByTestId('cms-new-site'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: en('shell.common.cancel') }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByTestId('cms-new-site'));
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mutationOf(CREATE_CMS_SITE)).not.toHaveBeenCalled();
  });

  it('shows the server sentence for a refused site and keeps the dialog', async () => {
    answerQuery(CMS_SITES, { data: { cmsSites: [] } });
    mutationOf(CREATE_CMS_SITE).mockRejectedValue({
      message: 'Key taken',
      errors: [{ message: 'Key "brand" is already used', extensions: { code: 'CONFLICT' } }],
    });
    mount();
    fireEvent.click(screen.getByTestId('cms-new-site'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(label('websiteApp.cms.site.name')), { target: { value: 'Brand site' } });
    fireEvent.change(within(dialog).getByLabelText(label('websiteApp.cms.site.key')), { target: { value: 'brand' } });
    fireEvent.click(within(dialog).getByTestId('cms-site-save'));
    expect(await within(dialog).findByText('Key "brand" is already used')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('workspace-route')).not.toBeInTheDocument());
  });
});
