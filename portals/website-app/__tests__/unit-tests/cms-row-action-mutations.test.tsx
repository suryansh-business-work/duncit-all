import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route } from 'react-router';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import RowActions from '../../src/pages/cms/components/RowActions';
import { useFragmentRowActions } from '../../src/pages/cms/fragments-tab/useFragmentRowActions';
import { usePageRowActions, type PageDialogs } from '../../src/pages/cms/pages-tab/usePageRowActions';
import { DELETE_CMS_FRAGMENT, PUBLISH_CMS_FRAGMENT, type CmsFragmentRow } from '../../src/pages/cms/queries/fragments';
import { DELETE_CMS_PAGE, PUBLISH_CMS_PAGE, UNPUBLISH_CMS_PAGE, type CmsPageRow } from '../../src/pages/cms/queries/pages';
import { renderWithProviders } from '../testkit';
import { en } from '../en';
import { makeCmsFragmentRow, makeCmsPageRow } from '../mocks/cms.mock';
import { mutationOf, resetApollo } from '../hooks-mock';

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

const refusal = (message: string, code: string) => ({ message: 'x', errors: [{ message, extensions: { code } }] });

const fragmentDialogs = () => ({ rename: vi.fn(), versions: vi.fn(), reels: vi.fn(), code: vi.fn(), copyLink: vi.fn() });
const pageDialogs = (): PageDialogs => ({
  settings: vi.fn(),
  preview: vi.fn(),
  duplicate: vi.fn(),
  versions: vi.fn(),
  copyLink: vi.fn(),
});

type FragmentDialogs = ReturnType<typeof fragmentDialogs>;

function FragmentMenu({ row, refresh, dialogs }: Readonly<{ row: CmsFragmentRow; refresh: () => void; dialogs: FragmentDialogs }>) {
  const actionsFor = useFragmentRowActions('site-1', refresh, dialogs);
  return <RowActions label={row.name} actions={actionsFor(row)} />;
}

function PageMenu({ row, refresh, dialogs }: Readonly<{ row: CmsPageRow; refresh: () => void; dialogs: PageDialogs }>) {
  const actionsFor = usePageRowActions('site-1', refresh, dialogs);
  return <RowActions label={row.title} actions={actionsFor(row)} />;
}

const mountFragment = (row: CmsFragmentRow, dialogs = fragmentDialogs()) => {
  const refresh = vi.fn();
  renderWithProviders(<FragmentMenu row={row} refresh={refresh} dialogs={dialogs} />, {
    routes: (
      <>
        <Route path="/" element={<FragmentMenu row={row} refresh={refresh} dialogs={dialogs} />} />
        <Route path="/sites/:siteId/fragments/:fragmentId/design" element={<div data-testid="fragment-designer" />} />
      </>
    ),
  });
  return { refresh, dialogs };
};

const mountPage = (row: CmsPageRow, dialogs = pageDialogs()) => {
  const refresh = vi.fn();
  renderWithProviders(<PageMenu row={row} refresh={refresh} dialogs={dialogs} />, {
    routes: (
      <>
        <Route path="/" element={<PageMenu row={row} refresh={refresh} dialogs={dialogs} />} />
        <Route path="/sites/:siteId/pages/:pageId/design" element={<div data-testid="page-designer" />} />
      </>
    ),
  });
  return { refresh, dialogs };
};

/** Opens the row menu and lists what it offers. */
const menuOf = (name: string) => {
  fireEvent.click(screen.getByRole('button', { name: `Actions: ${name}` }));
  return screen.getAllByRole('menuitem').map((item) => item.textContent);
};

const choose = (name: string, action: string) => {
  menuOf(name);
  fireEvent.click(screen.getByRole('menuitem', { name: action }));
};

beforeEach(() => {
  resetApollo();
  confirm.mockReset();
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
});

describe('component row menu — actions', () => {
  const draft = makeCmsFragmentRow({ id: 'frag-7', name: 'Pricing table' });

  it('opens the designer for that component', async () => {
    mountFragment(draft);
    choose('Pricing table', en('websiteApp.cms.pages.design'));
    expect(await screen.findByTestId('fragment-designer')).toBeInTheDocument();
  });

  it('hands rename, versions and reels the row it was chosen on', () => {
    const slider = makeCmsFragmentRow({ id: 'frag-8', name: 'Reel strip', blocks: ['reel-slider'] });
    const { dialogs } = mountFragment(slider);
    choose('Reel strip', en('websiteApp.cms.fragments.rename'));
    expect(dialogs.rename).toHaveBeenCalledWith(slider);
    choose('Reel strip', en('websiteApp.cms.pages.versions'));
    expect(dialogs.versions).toHaveBeenCalledWith(slider);
    choose('Reel strip', en('websiteApp.cms.fragments.manageReels'));
    expect(dialogs.reels).toHaveBeenCalledTimes(1);
  });

  it('offers Publish for a draft or a live component with changes, never for one already up to date', () => {
    mountFragment(makeCmsFragmentRow({ name: 'Live', is_published: true, has_unpublished_changes: false }));
    expect(menuOf('Live')).not.toContain(en('websiteApp.cms.pages.publish'));
  });

  it('publishes the component, says so and refreshes the list', async () => {
    const { refresh } = mountFragment(makeCmsFragmentRow({ id: 'frag-7', name: 'Pricing table', is_published: true, has_unpublished_changes: true }));
    choose('Pricing table', en('websiteApp.cms.pages.publish'));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(mutationOf(PUBLISH_CMS_FRAGMENT)).toHaveBeenCalledWith({ variables: { id: 'frag-7' } });
    expect(notifySuccess).toHaveBeenCalledWith(en('websiteApp.cms.pages.publishedToast'));
  });

  it("explains a refused publish with the server's sentence and leaves the list alone", async () => {
    mutationOf(PUBLISH_CMS_FRAGMENT).mockRejectedValue(refusal('A newer draft exists.', 'CONFLICT'));
    const { refresh } = mountFragment(draft);
    choose('Pricing table', en('websiteApp.cms.pages.publish'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('A newer draft exists.'));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('deletes only after confirmation, naming the component', async () => {
    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const { refresh } = mountFragment(draft);
    choose('Pricing table', en('shell.common.delete'));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(confirm.mock.calls[0][0]).toMatchObject({ message: en('websiteApp.cms.fragments.deleteText', { name: 'Pricing table' }), destructive: true });
    expect(mutationOf(DELETE_CMS_FRAGMENT)).not.toHaveBeenCalled();

    choose('Pricing table', en('shell.common.delete'));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(mutationOf(DELETE_CMS_FRAGMENT)).toHaveBeenCalledWith({ variables: { id: 'frag-7' } });
  });

  it('falls back to the console sentence when a delete fails for another reason', async () => {
    confirm.mockResolvedValue(true);
    mutationOf(DELETE_CMS_FRAGMENT).mockRejectedValue(new Error('socket hang up'));
    const { refresh } = mountFragment(draft);
    choose('Pricing table', en('shell.common.delete'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(en('websiteApp.cms.fragments.deleteFailed')));
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('page row menu — actions', () => {
  const page = makeCmsPageRow({ id: 'page-9', title: 'Careers' });

  it('opens the designer, settings, preview and versions for that page', async () => {
    const { dialogs } = mountPage(page);
    choose('Careers', en('websiteApp.cms.pages.settings'));
    expect(dialogs.settings).toHaveBeenCalledWith(page);
    choose('Careers', en('websiteApp.cms.pages.preview'));
    expect(dialogs.preview).toHaveBeenCalledWith(page);
    choose('Careers', en('websiteApp.cms.pages.versions'));
    expect(dialogs.versions).toHaveBeenCalledWith(page);
    choose('Careers', en('websiteApp.cms.pages.duplicate'));
    expect(dialogs.duplicate).toHaveBeenCalledWith(page);
    choose('Careers', en('websiteApp.cms.pages.design'));
    expect(await screen.findByTestId('page-designer')).toBeInTheDocument();
  });

  it('offers Publish but not Unpublish for a draft', () => {
    mountPage(page);
    const items = menuOf('Careers');
    expect(items).toContain(en('websiteApp.cms.pages.publish'));
    expect(items).not.toContain(en('websiteApp.cms.pages.unpublish'));
  });

  it('offers only Unpublish for a live page with no changes, and no Duplicate for a template', () => {
    mountPage(makeCmsPageRow({ title: 'Blog list', kind: 'COLLECTION_LIST', collection_type: 'BLOG', is_published: true }));
    const items = menuOf('Blog list');
    expect(items).toContain(en('websiteApp.cms.pages.unpublish'));
    expect(items).not.toContain(en('websiteApp.cms.pages.publish'));
    expect(items).not.toContain(en('websiteApp.cms.pages.duplicate'));
  });

  it('publishes the page, says so and refreshes', async () => {
    const { refresh } = mountPage(page);
    choose('Careers', en('websiteApp.cms.pages.publish'));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(mutationOf(PUBLISH_CMS_PAGE)).toHaveBeenCalledWith({ variables: { id: 'page-9' } });
    expect(notifySuccess).toHaveBeenCalledWith(en('websiteApp.cms.pages.publishedToast'));
  });

  it('reports a failed publish with the console sentence', async () => {
    mutationOf(PUBLISH_CMS_PAGE).mockRejectedValue(new Error('timeout'));
    const { refresh } = mountPage(page);
    choose('Careers', en('websiteApp.cms.pages.publish'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(en('websiteApp.cms.pages.publishFailed')));
    expect(refresh).not.toHaveBeenCalled();
  });

  it('takes a live page off the site, says so and refreshes', async () => {
    const { refresh } = mountPage(makeCmsPageRow({ id: 'page-3', title: 'Home', is_published: true, has_unpublished_changes: true }));
    choose('Home', en('websiteApp.cms.pages.unpublish'));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(mutationOf(UNPUBLISH_CMS_PAGE)).toHaveBeenCalledWith({ variables: { id: 'page-3' } });
    expect(notifySuccess).toHaveBeenCalledWith(en('websiteApp.cms.pages.unpublishedToast'));
  });

  it("explains a refused unpublish with the server's sentence", async () => {
    mutationOf(UNPUBLISH_CMS_PAGE).mockRejectedValue(refusal('The home page must stay live.', 'BAD_USER_INPUT'));
    const { refresh } = mountPage(makeCmsPageRow({ title: 'Home', is_published: true }));
    choose('Home', en('websiteApp.cms.pages.unpublish'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('The home page must stay live.'));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('deletes a page only after confirmation, naming it', async () => {
    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const { refresh } = mountPage(page);
    choose('Careers', en('shell.common.delete'));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(confirm.mock.calls[0][0]).toMatchObject({ message: en('websiteApp.cms.pages.deleteText', { title: 'Careers' }), destructive: true });
    expect(mutationOf(DELETE_CMS_PAGE)).not.toHaveBeenCalled();

    choose('Careers', en('shell.common.delete'));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(mutationOf(DELETE_CMS_PAGE)).toHaveBeenCalledWith({ variables: { id: 'page-9' } });
  });

  it('reports a page that could not be deleted', async () => {
    confirm.mockResolvedValue(true);
    mutationOf(DELETE_CMS_PAGE).mockRejectedValue(new Error('socket hang up'));
    const { refresh } = mountPage(page);
    choose('Careers', en('shell.common.delete'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(en('websiteApp.cms.pages.deleteFailed')));
    expect(refresh).not.toHaveBeenCalled();
  });
});
