import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { OccasionTheme } from '@duncit/gql-types';
import { renderWithProviders } from '../testkit';
import { makeLook } from '../mocks/occasions-themes.mock';

vi.mock('@duncit/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/ui')>()),
  OccasionEffects: () => <div data-testid="effects" />,
}));

import { groupThemes, type ThemeFilters } from '../../src/pages/occasions-page/themes/filterThemes';
import ThemeCard from '../../src/pages/occasions-page/themes/ThemeCard';
import ThemesToolbar from '../../src/pages/occasions-page/themes/ThemesToolbar';

const filters = (over: Partial<ThemeFilters> = {}): ThemeFilters => ({ search: '', region: 'ALL', showArchived: false, ...over });

const diwali = makeLook();
const holi = makeLook({ key: 'holi', name: 'Holi', description: 'Colours everywhere' });
const christmas = makeLook({ key: 'christmas', name: 'Christmas', description: 'Snow', region: 'WESTERN', is_builtin: true });
const oldLook = makeLook({ key: 'old-diwali', name: 'Old Diwali', description: '', region: 'INDIAN', is_archived: true });
const mine = makeLook({ key: 'team-day', name: 'Team day', description: 'Ours', region: 'CUSTOM' });

describe('groupThemes', () => {
  const all = [mine, christmas, diwali, oldLook, holi];
  const keys = (groups: ReturnType<typeof groupThemes>) => groups.map((g) => [g.region, g.looks.map((l) => l.key)]);

  it('groups the kept looks by region in catalogue order, keeping server order inside a region and dropping empty regions', () => {
    expect(keys(groupThemes(all, filters()))).toEqual([
      ['INDIAN', ['diwali', 'holi']],
      ['WESTERN', ['christmas']],
      ['CUSTOM', ['team-day']],
    ]);
  });

  it('keeps archived looks only when asked', () => {
    expect(keys(groupThemes(all, filters({ showArchived: true })))[0]).toEqual(['INDIAN', ['diwali', 'old-diwali', 'holi']]);
  });

  it('keeps one region only when one is picked', () => {
    expect(keys(groupThemes(all, filters({ region: 'WESTERN' })))).toEqual([['WESTERN', ['christmas']]]);
  });

  it('searches the name, description and key, ignoring case and surrounding spaces', () => {
    expect(keys(groupThemes(all, filters({ search: '  SNOW ' })))).toEqual([['WESTERN', ['christmas']]]);
    expect(keys(groupThemes(all, filters({ search: 'team-' })))).toEqual([['CUSTOM', ['team-day']]]);
    expect(keys(groupThemes(all, filters({ search: 'holi' })))).toEqual([['INDIAN', ['holi']]]);
    expect(groupThemes(all, filters({ search: 'nothing like this' }))).toEqual([]);
  });
});

describe('ThemesToolbar', () => {
  it('hands up the typed search, the archived switch and the picked region, and links to a new look', () => {
    const onChange = vi.fn();
    const current = filters({ region: 'INDIAN' });
    renderWithProviders(<ThemesToolbar filters={current} onChange={onChange} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Search looks' }), { target: { value: 'gold' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...current, search: 'gold' });

    fireEvent.click(screen.getByLabelText('Show archived'));
    expect(onChange).toHaveBeenLastCalledWith({ ...current, showArchived: true });

    const regions = screen.getByRole('group', { name: 'Filter by region' });
    const chips = within(regions).getAllByRole('button');
    expect(chips.map((chip) => chip.textContent)).toEqual([
      'All',
      'Indian festivals',
      'National days',
      'Western festivals',
      'Global days',
      'Custom looks',
    ]);
    expect(within(regions).getByRole('button', { name: 'Indian festivals' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(regions).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(within(regions).getByRole('button', { name: 'All' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...current, region: 'ALL' });

    expect(screen.getByRole('link', { name: 'New look' })).toHaveAttribute('href', '/occasions/themes/new');
  });
});

const handlers = () => ({
  onPreview: vi.fn(),
  onApply: vi.fn(),
  onDuplicate: vi.fn(),
  onArchive: vi.fn(),
  onReset: vi.fn(),
  onDelete: vi.fn(),
});

const renderCard = (look: OccasionTheme, live = false) => {
  const h = handlers();
  renderWithProviders(<ThemeCard look={look} live={live} mode="light" {...h} />);
  return h;
};

const openMenu = (name: string) => fireEvent.click(screen.getByRole('button', { name: `More actions for ${name}` }));

describe('ThemeCard', () => {
  it('shows a look someone made: its phone, name, colours, preview, edit and apply', () => {
    const h = renderCard(makeLook({ key: 'diwali 2026' }));
    const card = screen.getByTestId('occasion-card-diwali 2026');
    expect(within(card).getByRole('heading', { name: 'Diwali' })).toBeInTheDocument();
    expect(within(card).getByText('Lamps and gold')).toBeInTheDocument();
    expect(within(card).getByRole('img', { name: 'Preview of Diwali on a phone' })).toBeInTheDocument();
    expect(within(card).getByRole('list', { name: 'Key colours' })).toBeInTheDocument();
    expect(within(card).queryByText('Live now')).not.toBeInTheDocument();
    expect(within(card).queryByText('Built-in')).not.toBeInTheDocument();
    expect(within(card).queryByText('Archived')).not.toBeInTheDocument();
    expect(within(card).queryByText(/–/)).not.toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Edit Diwali' })).toHaveAttribute('href', '/occasions/themes/diwali%202026');

    fireEvent.click(within(card).getByRole('button', { name: 'Preview Diwali' }));
    expect(h.onPreview).toHaveBeenCalledWith(expect.objectContaining({ key: 'diwali 2026' }));
    fireEvent.click(within(card).getByRole('button', { name: 'Apply now' }));
    expect(h.onApply).toHaveBeenCalledWith(expect.objectContaining({ key: 'diwali 2026' }));
  });

  it('marks the live look and offers no apply for it', () => {
    renderCard(diwali, true);
    expect(screen.getByText('Live now')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply now' })).not.toBeInTheDocument();
  });

  it('shows the dates of a scheduled look, and says when its schedule is off', () => {
    const dated = { starts_at: '2026-11-01T00:00:00.000Z', ends_at: '2026-11-05T00:00:00.000Z' };
    const { unmount } = renderWithProviders(
      <ThemeCard look={makeLook({ ...dated, schedule_enabled: true })} live={false} mode="light" {...handlers()} />,
    );
    const on = screen.getByText(/–/);
    expect(on.textContent).not.toContain('(off)');
    unmount();
    renderCard(makeLook({ ...dated, schedule_enabled: false }));
    expect(screen.getByText(/–.*\(off\)/)).toBeInTheDocument();
  });

  it('shows no dates when only one end is set', () => {
    renderCard(makeLook({ starts_at: '2026-11-01T00:00:00.000Z', ends_at: null }));
    expect(screen.queryByText(/–/)).not.toBeInTheDocument();
  });

  it('marks an archived built-in look, offers no apply, and in its menu unarchives or resets but never deletes', async () => {
    const look = makeLook({ is_builtin: true, is_archived: true });
    const h = renderCard(look);
    expect(screen.getByText('Built-in')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply now' })).not.toBeInTheDocument();

    const more = screen.getByRole('button', { name: 'More actions for Diwali' });
    expect(more).toHaveAttribute('aria-haspopup', 'menu');
    expect(more).not.toHaveAttribute('aria-expanded');
    openMenu('Diwali');
    expect(more).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu');
    // The button controls the menu's popup, which holds the list of actions.
    const controlled = document.getElementById(more.getAttribute('aria-controls') ?? '');
    expect(controlled).toContainElement(menu);
    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Duplicate', 'Unarchive', 'Reset']);

    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Reset' }));
    expect(h.onReset).toHaveBeenCalledWith(look);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());

    openMenu('Diwali');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Unarchive' }));
    expect(h.onArchive).toHaveBeenCalledWith(look);
  });

  it('lets a look someone made be duplicated, archived or deleted, and closes the menu on Escape', async () => {
    const h = renderCard(diwali);
    openMenu('Diwali');
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Duplicate', 'Archive', 'Delete']);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(h.onDelete).toHaveBeenCalledWith(diwali);

    openMenu('Diwali');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));
    expect(h.onArchive).toHaveBeenCalledWith(diwali);

    openMenu('Diwali');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }));
    expect(h.onDuplicate).toHaveBeenCalledWith(diwali);

    openMenu('Diwali');
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(h.onReset).not.toHaveBeenCalled();
  });
});
