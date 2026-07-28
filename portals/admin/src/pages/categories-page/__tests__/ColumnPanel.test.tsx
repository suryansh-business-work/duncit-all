import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import ColumnPanel from '../ColumnPanel';
import type { CatItem, Level } from '../queries';
import { catNode, categoriesErrorMock, categoriesMock, mediaNode, renderWithProviders } from './testkit';

const handlers = () => ({
  onSelect: vi.fn(),
  onCreate: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
});

type Handlers = ReturnType<typeof handlers>;

const renderPanel = (
  opts: Readonly<{
    level: Level;
    parentId: string | null | undefined;
    title?: string;
    parentName?: string;
    selectedId?: string | null;
    mocks?: Parameters<typeof renderWithProviders>[1];
    cbs?: Handlers;
  }>
) => {
  const cbs = opts.cbs ?? handlers();
  const view = renderWithProviders(
    <ColumnPanel
      title={opts.title ?? 'Super Categories'}
      level={opts.level}
      parentId={opts.parentId}
      parentName={opts.parentName}
      selectedId={opts.selectedId ?? null}
      onSelect={cbs.onSelect}
      onCreate={cbs.onCreate}
      onEdit={cbs.onEdit}
      onDelete={cbs.onDelete}
    />,
    opts.mocks ?? []
  );
  return { ...view, cbs };
};

/** The clickable row wrapping a category name. */
const rowOf = (name: string) => {
  const row = screen.getByText(name).closest('div[role="button"]');
  if (!row) throw new Error(`no row for ${name}`);
  return row as HTMLElement;
};

const addButton = () => {
  const button = screen.getByTestId('AddIcon').closest('button');
  if (!button) throw new Error('no add button');
  return button;
};

describe('ColumnPanel', () => {
  it('asks for the SUPER level with a null parent and lists what comes back', async () => {
    renderPanel({
      level: 'SUPER',
      parentId: null,
      mocks: [
        categoriesMock('SUPER', null, [
          catNode({ id: 's1', name: 'Human', level: 'SUPER' }),
          catNode({ id: 's2', name: 'Pet', level: 'SUPER' }),
        ]),
      ],
    });

    // Only a matching `filter` unblocks the mock, so seeing the rows proves the
    // variables the panel sent.
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(await screen.findByText('Human')).toBeTruthy();
    expect(screen.getByText('Pet')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('scopes the query to the selected parent', async () => {
    renderPanel({
      level: 'CATEGORY',
      parentId: 's1',
      title: 'Categories',
      parentName: 'Human',
      mocks: [categoriesMock('CATEGORY', 's1', [catNode({ id: 'c9', name: 'Cricket' })])],
    });

    expect(await screen.findByText('Cricket')).toBeTruthy();
    expect(screen.getByText('Human').tagName).toBe('STRONG');
  });

  it('never queries and disables + until a parent is picked', () => {
    // No mocks at all: a query here would surface as an Apollo "no more mocked
    // responses" error instead of the hint below.
    renderPanel({ level: 'CATEGORY', parentId: undefined, title: 'Categories' });

    expect(screen.getByText('Select a super category on the left.')).toBeTruthy();
    expect(addButton().disabled).toBe(true);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('names the sub-category parent in its own hint', () => {
    renderPanel({ level: 'SUB', parentId: null, title: 'Sub-Categories' });

    expect(screen.getByText('Select a category on the left.')).toBeTruthy();
  });

  it('surfaces the query error message', async () => {
    renderPanel({
      level: 'SUPER',
      parentId: null,
      mocks: [categoriesErrorMock('SUPER', null, new Error('categories exploded'))],
    });

    expect(await screen.findByText('categories exploded')).toBeTruthy();
  });

  it('invites a first item when the level is empty', async () => {
    renderPanel({ level: 'SUPER', parentId: null, mocks: [categoriesMock('SUPER', null, [])] });

    expect(await screen.findByText('No items yet. Click + to create one.')).toBeTruthy();
  });

  it('flags system and inactive rows', async () => {
    renderPanel({
      level: 'SUPER',
      parentId: null,
      mocks: [
        categoriesMock('SUPER', null, [
          catNode({ id: 's1', name: 'Human', is_system: true }),
          catNode({ id: 's2', name: 'Pet', is_active: false }),
          catNode({ id: 's3', name: 'Plain' }),
        ]),
      ],
    });

    await screen.findByText('Human');
    expect(within(rowOf('Human')).getByText('system')).toBeTruthy();
    expect(within(rowOf('Human')).queryByText('inactive')).toBeNull();
    expect(within(rowOf('Pet')).getByText('inactive')).toBeTruthy();
    expect(within(rowOf('Plain')).queryByText('system')).toBeNull();
    expect(within(rowOf('Plain')).queryByText('inactive')).toBeNull();
  });

  it('truncates a long description at 50 characters and leaves short ones whole', async () => {
    const long = 'x'.repeat(60);
    const short = 'Short and sweet';
    renderPanel({
      level: 'SUPER',
      parentId: null,
      mocks: [
        categoriesMock('SUPER', null, [
          catNode({ id: 's1', name: 'Long', description: long }),
          catNode({ id: 's2', name: 'Short', description: short }),
          catNode({ id: 's3', name: 'None', description: null }),
        ]),
      ],
    });

    await screen.findByText('Long');
    expect(screen.getByText(`${'x'.repeat(50)}…`)).toBeTruthy();
    expect(screen.getByText(short)).toBeTruthy();
    // Avatar initial + name, and nothing else: a null description renders no
    // secondary line at all.
    expect(rowOf('None').textContent).toBe('NNone');
  });

  it('renders an uploaded image icon as the avatar picture', async () => {
    renderPanel({
      level: 'SUPER',
      parentId: null,
      mocks: [
        categoriesMock('SUPER', null, [
          catNode({ id: 's1', name: 'Human', icon: 'https://cdn.test/human.png' }),
        ]),
      ],
    });

    await screen.findByText('Human');
    expect(rowOf('Human').querySelector('img')?.getAttribute('src')).toBe(
      'https://cdn.test/human.png'
    );
  });

  it('renders a Material icon name as that icon, not as text', async () => {
    renderPanel({
      level: 'SUPER',
      parentId: null,
      mocks: [categoriesMock('SUPER', null, [catNode({ id: 's1', name: 'Pet', icon: 'Pets' })])],
    });

    await screen.findByText('Pet');
    expect(within(rowOf('Pet')).getByTestId('PetsIcon')).toBeTruthy();
    expect(rowOf('Pet').querySelector('img')).toBeNull();
    expect(rowOf('Pet').textContent).not.toContain('Pets');
  });

  it('renders a non-icon string (emoji) as avatar text', async () => {
    renderPanel({
      level: 'SUPER',
      parentId: null,
      mocks: [categoriesMock('SUPER', null, [catNode({ id: 's1', name: 'Party', icon: '🎉' })])],
    });

    await screen.findByText('Party');
    expect(rowOf('Party').textContent).toContain('🎉');
  });

  it('falls back to the first media image only when there is no icon', async () => {
    renderPanel({
      level: 'SUPER',
      parentId: null,
      mocks: [
        categoriesMock('SUPER', null, [
          catNode({
            id: 's1',
            name: 'Human',
            icon: '',
            media: [mediaNode('https://cdn.test/cover.jpg')],
          }),
          catNode({
            id: 's2',
            name: 'Pet',
            icon: 'Pets',
            media: [mediaNode('https://cdn.test/ignored.jpg')],
          }),
        ]),
      ],
    });

    await screen.findByText('Human');
    expect(rowOf('Human').querySelector('img')?.getAttribute('src')).toBe(
      'https://cdn.test/cover.jpg'
    );
    expect(rowOf('Pet').querySelector('img')).toBeNull();
  });

  it('falls back to the first letter of the name with no icon and no media', async () => {
    renderPanel({
      level: 'SUPER',
      parentId: null,
      mocks: [categoriesMock('SUPER', null, [catNode({ id: 's1', name: 'Zebra', icon: '' })])],
    });

    await screen.findByText('Zebra');
    expect(rowOf('Zebra').textContent).toBe('ZZebra');
  });

  it('selects on row click and keeps edit/delete from selecting too', async () => {
    const cbs = handlers();
    renderPanel({
      level: 'SUPER',
      parentId: null,
      cbs,
      mocks: [categoriesMock('SUPER', null, [catNode({ id: 's1', name: 'Human', level: 'SUPER' })])],
    });

    await screen.findByText('Human');
    fireEvent.click(rowOf('Human'));
    expect(cbs.onSelect).toHaveBeenCalledTimes(1);
    const selected = cbs.onSelect.mock.calls[0][0] as CatItem;
    expect(selected.id).toBe('s1');
    expect(selected.name).toBe('Human');

    const editIcon = within(rowOf('Human')).getByTestId('EditIcon').closest('button');
    fireEvent.click(editIcon as HTMLButtonElement);
    expect(cbs.onEdit).toHaveBeenCalledTimes(1);
    expect((cbs.onEdit.mock.calls[0][0] as CatItem).id).toBe('s1');
    expect(cbs.onSelect).toHaveBeenCalledTimes(1);

    const deleteIcon = within(rowOf('Human')).getByTestId('DeleteIcon').closest('button');
    fireEvent.click(deleteIcon as HTMLButtonElement);
    expect(cbs.onDelete).toHaveBeenCalledTimes(1);
    expect((cbs.onDelete.mock.calls[0][0] as CatItem).id).toBe('s1');
    expect(cbs.onSelect).toHaveBeenCalledTimes(1);
  });

  it('shows the drill-down chevron above SUB level only', async () => {
    const { unmount } = renderPanel({
      level: 'SUPER',
      parentId: null,
      mocks: [categoriesMock('SUPER', null, [catNode({ id: 's1', name: 'Human' })])],
    });
    await screen.findByText('Human');
    expect(within(rowOf('Human')).getByTestId('ChevronRightIcon')).toBeTruthy();
    unmount();

    renderPanel({
      level: 'SUB',
      parentId: 'c1',
      title: 'Sub-Categories',
      mocks: [categoriesMock('SUB', 'c1', [catNode({ id: 'b1', name: 'T20', level: 'SUB' })])],
    });
    await screen.findByText('T20');
    expect(within(rowOf('T20')).queryByTestId('ChevronRightIcon')).toBeNull();
  });

  it('creates from the + button once a parent exists', async () => {
    const cbs = handlers();
    renderPanel({
      level: 'CATEGORY',
      parentId: 's1',
      title: 'Categories',
      cbs,
      mocks: [categoriesMock('CATEGORY', 's1', [])],
    });

    await screen.findByText('No items yet. Click + to create one.');
    expect(addButton().disabled).toBe(false);
    fireEvent.click(addButton());
    expect(cbs.onCreate).toHaveBeenCalledTimes(1);
  });
});
