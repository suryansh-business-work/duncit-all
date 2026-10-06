import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import RowActions from '../../src/pages/cms/components/RowActions';
import { useFragmentRowActions } from '../../src/pages/cms/fragments-tab/useFragmentRowActions';
import { usePageRowActions, type PageDialogs } from '../../src/pages/cms/pages-tab/usePageRowActions';
import type { CmsFragmentRow } from '../../src/pages/cms/queries/fragments';
import type { CmsPageRow } from '../../src/pages/cms/queries/pages';
import { renderWithProviders } from '../testkit';
import { makeCmsFragmentRow, makeCmsPageRow } from '../mocks/cms.mock';

const fragmentDialogs = () => ({ rename: vi.fn(), versions: vi.fn(), reels: vi.fn(), code: vi.fn(), copyLink: vi.fn() });
const pageDialogs = (): PageDialogs => ({ settings: vi.fn(), preview: vi.fn(), duplicate: vi.fn(), versions: vi.fn(), copyLink: vi.fn() });

function FragmentMenu({ row, dialogs }: Readonly<{ row: CmsFragmentRow; dialogs: ReturnType<typeof fragmentDialogs> }>) {
  const actionsFor = useFragmentRowActions('site-1', vi.fn(), dialogs);
  return <RowActions label={row.name} actions={actionsFor(row)} />;
}

function PageMenu({ row, dialogs }: Readonly<{ row: CmsPageRow; dialogs: PageDialogs }>) {
  const actionsFor = usePageRowActions('site-1', vi.fn(), dialogs);
  return <RowActions label={row.title} actions={actionsFor(row)} />;
}

const openMenu = (label: string) => {
  fireEvent.click(screen.getByRole('button', { name: `Actions: ${label}` }));
  return screen.getAllByRole('menuitem').map((item) => item.textContent);
};

describe('component row menu', () => {
  const row = makeCmsFragmentRow({ id: 'frag-7', name: 'Pricing table' });

  it('offers Edit code and Copy preview link right after Design', () => {
    renderWithProviders(<FragmentMenu row={row} dialogs={fragmentDialogs()} />);
    expect(openMenu('Pricing table').slice(0, 3)).toEqual(['Design', 'Edit code', 'Copy preview link']);
  });

  it('opens the code dialog for that component', () => {
    const dialogs = fragmentDialogs();
    renderWithProviders(<FragmentMenu row={row} dialogs={dialogs} />);
    openMenu('Pricing table');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit code' }));
    expect(dialogs.code).toHaveBeenCalledWith(row);
    expect(dialogs.copyLink).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it("copies that component's preview link", () => {
    const dialogs = fragmentDialogs();
    renderWithProviders(<FragmentMenu row={row} dialogs={dialogs} />);
    openMenu('Pricing table');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy preview link' }));
    expect(dialogs.copyLink).toHaveBeenCalledWith(row);
    expect(dialogs.code).not.toHaveBeenCalled();
  });
});

describe('page row menu', () => {
  it("offers Copy preview link after Preview and copies that page's link", () => {
    const row = makeCmsPageRow({ id: 'page-9', title: 'Careers' });
    const dialogs = pageDialogs();
    renderWithProviders(<PageMenu row={row} dialogs={dialogs} />);
    expect(openMenu('Careers').slice(0, 4)).toEqual(['Design', 'Page settings', 'Preview', 'Copy preview link']);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy preview link' }));
    expect(dialogs.copyLink).toHaveBeenCalledWith(row);
    expect(dialogs.preview).not.toHaveBeenCalled();
  });
});
