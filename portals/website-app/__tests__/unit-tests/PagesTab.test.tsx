import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import PagesTab from '../../src/pages/cms/pages-tab/PagesTab';
import { CMS_PAGES_TABLE } from '../../src/pages/cms/queries/pages';
import { renderWithProviders } from '../testkit';
import { tablePageMock } from '../mocks/table';
import { makeCmsPageRow, makeCmsSiteRow } from '../mocks/cms.mock';

const copy = vi.hoisted(() => ({ page: vi.fn(), component: vi.fn() }));
vi.mock('../../src/pages/cms/lib/useCopyPreviewLink', () => ({ useCopyPreviewLink: () => copy }));
vi.mock('../../src/pages/cms/pages-tab/PageSettingsDialog', () => ({ default: () => null }));
vi.mock('../../src/pages/cms/pages-tab/DuplicateDialog', () => ({ default: () => null }));
vi.mock('../../src/pages/cms/components/PreviewDialog', () => ({ default: () => null }));
vi.mock('../../src/pages/cms/components/VersionsDialog', () => ({ default: () => null }));

const row = makeCmsPageRow({ id: 'page-9', title: 'Careers', path: '/careers' });

describe('PagesTab — copy preview link', () => {
  it("copies the page's draft preview link from its row menu", async () => {
    renderWithProviders(<PagesTab site={makeCmsSiteRow()} />, { mocks: [tablePageMock(CMS_PAGES_TABLE, 'cmsPagesTable', 'CmsPageTablePage', [row])] });
    fireEvent.click(await screen.findByRole('button', { name: 'Actions: Careers' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy preview link' }));
    expect(copy.page).toHaveBeenCalledWith('page-9');
    expect(copy.component).not.toHaveBeenCalled();
  });
});
