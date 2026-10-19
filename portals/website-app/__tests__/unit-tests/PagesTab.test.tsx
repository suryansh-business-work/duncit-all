import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import PagesTab from '../../src/pages/cms/pages-tab/PagesTab';
import { CMS_PAGES_TABLE, type CmsPageRow } from '../../src/pages/cms/queries/pages';
import type { PagePreset } from '../../src/pages/cms/pages-tab/page-form';
import { renderWithProviders } from '../testkit';
import { en } from '../en';
import { tablePageMock } from '../mocks/table';
import { makeCmsPageRow, makeCmsSiteRow } from '../mocks/cms.mock';

const copy = vi.hoisted(() => ({ page: vi.fn(), component: vi.fn() }));
vi.mock('../../src/pages/cms/lib/useCopyPreviewLink', () => ({ useCopyPreviewLink: () => copy }));
// Every dialog has its own suite; here only which page the tab opens each one for, and what it does after.
vi.mock('../../src/pages/cms/pages-tab/PageSettingsDialog', () => ({
  default: ({ state, onClose, onSaved }: { state: { page: CmsPageRow | null; preset?: PagePreset } | null; onClose: () => void; onSaved: () => void }) =>
    state ? (
      <div role="dialog" aria-label="settings dialog">
        <span>{state.page ? `Settings of ${state.page.title}` : 'A new page'}</span>
        {state.preset && <span>{`Preset ${state.preset.path} titled ${state.preset.title}`}</span>}
        <button type="button" onClick={onSaved}>
          settings saved
        </button>
        <button type="button" onClick={onClose}>
          close settings
        </button>
      </div>
    ) : null,
}));
vi.mock('../../src/pages/cms/pages-tab/DuplicateDialog', () => ({
  default: ({ page, onClose, onDuplicated }: { page: CmsPageRow | null; onClose: () => void; onDuplicated: () => void }) =>
    page ? (
      <div role="dialog" aria-label={`Duplicate ${page.title}`}>
        <button type="button" onClick={onDuplicated}>
          duplicated
        </button>
        <button type="button" onClick={onClose}>
          close duplicate
        </button>
      </div>
    ) : null,
}));
vi.mock('../../src/pages/cms/components/PreviewDialog', () => ({
  default: ({ pageId, title, onClose }: { pageId: string | null; title: string; onClose: () => void }) =>
    pageId ? (
      <div role="dialog" aria-label={`Preview ${pageId} ${title}`}>
        <button type="button" onClick={onClose}>
          close preview
        </button>
      </div>
    ) : null,
}));
vi.mock('../../src/pages/cms/components/VersionsDialog', () => ({
  default: ({ owner, onClose, onRestored }: { owner: { kind: string; id: string; name: string } | null; onClose: () => void; onRestored: () => void }) =>
    owner ? (
      <div role="dialog" aria-label={`${owner.kind} ${owner.id} versions of ${owner.name}`}>
        <button type="button" onClick={onRestored}>
          restored
        </button>
        <button type="button" onClick={onClose}>
          close versions
        </button>
      </div>
    ) : null,
}));

const row = makeCmsPageRow({ id: 'page-9', title: 'Careers', path: '/careers' });

const tableFetches = vi.fn(() => ({ data: { cmsPagesTable: { __typename: 'CmsPageTablePage', total: 1, rows: [row] } } }));
const pagesTable: MockedResponse = {
  request: { query: CMS_PAGES_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: tableFetches,
};

const mount = (mocks: MockedResponse[] = [pagesTable]) => renderWithProviders(<PagesTab site={makeCmsSiteRow()} />, { mocks });

const openRowAction = async (action: string) => {
  fireEvent.click(await screen.findByRole('button', { name: 'Actions: Careers' }));
  fireEvent.click(screen.getByRole('menuitem', { name: action }));
};

/** Clicks `button` and expects the pages table to be read again. */
const expectRefreshOn = async (button: string) => {
  const before = tableFetches.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: button }));
  await waitFor(() => expect(tableFetches.mock.calls.length).toBeGreaterThan(before));
};

beforeEach(() => {
  copy.page.mockClear();
  copy.component.mockClear();
  tableFetches.mockClear();
  localStorage.clear();
});

describe('PagesTab — copy preview link', () => {
  it("copies the page's draft preview link from its row menu", async () => {
    renderWithProviders(<PagesTab site={makeCmsSiteRow()} />, { mocks: [tablePageMock(CMS_PAGES_TABLE, 'cmsPagesTable', 'CmsPageTablePage', [row])] });
    fireEvent.click(await screen.findByRole('button', { name: 'Actions: Careers' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy preview link' }));
    expect(copy.page).toHaveBeenCalledWith('page-9');
    expect(copy.component).not.toHaveBeenCalled();
  });
});

describe('PagesTab — the table', () => {
  it('shows each page at its address, a template by its collection, and the live version', async () => {
    const rows = [
      makeCmsPageRow({ id: 'p-home', title: 'Home', path: '/', is_published: true, published: { version: 3, published_at: '2026-10-01T10:00:00.000Z' }, updated_at: '' }),
      makeCmsPageRow({ id: 'p-jobs', title: 'Jobs list', path: '', kind: 'COLLECTION_LIST', collection_type: 'CAREER' }),
      makeCmsPageRow({ id: 'p-post', title: 'Post detail', path: '', kind: 'COLLECTION_DETAIL', collection_type: null }),
    ];
    mount([tablePageMock(CMS_PAGES_TABLE, 'cmsPagesTable', 'CmsPageTablePage', rows)]);
    expect(await screen.findByText('Jobs list')).toBeInTheDocument();
    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getByText(en('websiteApp.cms.collection.career'))).toBeInTheDocument();
    // A template saved without a collection reads as the blog's.
    expect(screen.getByText(en('websiteApp.cms.collection.blog'))).toBeInTheDocument();
    expect(screen.getByText(en('websiteApp.cms.pages.kindList'))).toBeInTheDocument();
    expect(screen.getByText(en('websiteApp.cms.pages.kindDetail'))).toBeInTheDocument();
    expect(screen.getByText(en('websiteApp.cms.pages.published'))).toBeInTheDocument();
    expect(screen.getAllByText(en('websiteApp.cms.pages.draft'))).toHaveLength(2);
  });
});

describe('PagesTab — starting a page', () => {
  it('opens a blank page from New page and refreshes after it is saved', async () => {
    mount();
    await screen.findByRole('button', { name: 'Actions: Careers' });
    fireEvent.click(screen.getByTestId('cms-new-page'));
    expect(screen.getByText('A new page')).toBeInTheDocument();
    expect(screen.queryByText(/^Preset/)).not.toBeInTheDocument();
    await expectRefreshOn('settings saved');
    fireEvent.click(screen.getByRole('button', { name: 'close settings' }));
    expect(screen.queryByRole('dialog', { name: 'settings dialog' })).not.toBeInTheDocument();
  });

  it.each([
    ['error404', '/404', 'error404Title'],
    ['error500', '/500', 'error500Title'],
    ['error503', '/503', 'error503Title'],
  ])('starts the %s page at its address with its title', async (item, path, titleKey) => {
    mount();
    const button = screen.getByTestId('cms-error-pages');
    expect(button).not.toHaveAttribute('aria-expanded');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    fireEvent.click(screen.getByRole('menuitem', { name: en(`websiteApp.cms.pages.${item}`) }));

    expect(screen.getByText('A new page')).toBeInTheDocument();
    expect(screen.getByText(`Preset ${path} titled ${en(`websiteApp.cms.pages.${titleKey}`)}`)).toBeInTheDocument();
    expect(button).not.toHaveAttribute('aria-expanded');
  });

  it('closes the error-pages menu on Escape without starting a page', async () => {
    mount();
    const button = screen.getByTestId('cms-error-pages');
    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(button).not.toHaveAttribute('aria-expanded');
    expect(screen.queryByRole('dialog', { name: 'settings dialog' })).not.toBeInTheDocument();
  });
});

describe('PagesTab — row dialogs', () => {
  it("opens the chosen page's settings", async () => {
    mount();
    await openRowAction(en('websiteApp.cms.pages.settings'));
    expect(screen.getByText('Settings of Careers')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'close settings' }));
    expect(screen.queryByText('Settings of Careers')).not.toBeInTheDocument();
  });

  it('previews the chosen page and closes the preview', async () => {
    mount();
    await openRowAction(en('websiteApp.cms.pages.preview'));
    expect(screen.getByRole('dialog', { name: 'Preview page-9 Careers' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'close preview' }));
    expect(screen.queryByRole('dialog', { name: /^Preview/ })).not.toBeInTheDocument();
  });

  it('duplicates the chosen page and refreshes the list once the copy exists', async () => {
    mount();
    await openRowAction(en('websiteApp.cms.pages.duplicate'));
    expect(screen.getByRole('dialog', { name: 'Duplicate Careers' })).toBeInTheDocument();
    await expectRefreshOn('duplicated');
    fireEvent.click(screen.getByRole('button', { name: 'close duplicate' }));
    expect(screen.queryByRole('dialog', { name: 'Duplicate Careers' })).not.toBeInTheDocument();
  });

  it("shows the page's versions and refreshes after a restore", async () => {
    mount();
    await openRowAction(en('websiteApp.cms.pages.versions'));
    expect(screen.getByRole('dialog', { name: 'PAGE page-9 versions of Careers' })).toBeInTheDocument();
    await expectRefreshOn('restored');
    fireEvent.click(screen.getByRole('button', { name: 'close versions' }));
    expect(screen.queryByRole('dialog', { name: /versions of/ })).not.toBeInTheDocument();
  });
});
