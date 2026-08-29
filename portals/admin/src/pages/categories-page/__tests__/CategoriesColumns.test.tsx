import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import CategoriesColumns from '../CategoriesColumns';
import type { CatItem, Level } from '../queries';
import { renderWithProviders } from './testkit';

// CategoriesColumns is pure wiring: it decides which level/parent each column
// queries and what its handlers do. ColumnPanel's own fetching/rendering is
// covered by ColumnPanel.test.tsx, so it is stubbed here to capture the exact
// props CategoriesColumns hands it and to call those handlers directly —
// including the "no parent picked yet" branches a disabled + button and an
// empty column never let a real click reach.
const panelProps: Record<string, any> = {};

vi.mock('../ColumnPanel', () => ({
  default: (props: Record<string, any>) => {
    panelProps[props.level as string] = props;
    return <div data-testid={`panel-${props.level}`} />;
  },
}));

const item = (over: Partial<CatItem> = {}): CatItem => ({
  id: 'c1',
  name: 'Cricket',
  media: [],
  level: 'CATEGORY',
  parent_id: null,
  is_active: true,
  is_system: false,
  sort_order: 0,
  allow_co_hosts: false,
  max_co_hosts: 1,
  min_pax: 0,
  gift_card_image_front: '',
  gift_card_image_back: '',
  ...over,
});

interface Props {
  superSel: CatItem | null;
  catSel: CatItem | null;
  setSuperSel: (it: CatItem | null) => void;
  setCatSel: (it: CatItem | null) => void;
  openCreate: (level: Level, parentId: string | null) => void;
  openEdit: (level: Level, parentId: string | null, item: CatItem) => void;
  remove: (level: Level, item: CatItem) => void;
}

const setup = (over: Partial<Props> = {}) => {
  const props: Props = {
    superSel: null,
    catSel: null,
    setSuperSel: vi.fn(),
    setCatSel: vi.fn(),
    openCreate: vi.fn(),
    openEdit: vi.fn(),
    remove: vi.fn(),
    ...over,
  };
  renderWithProviders(<CategoriesColumns {...props} />);
  return props;
};

describe('CategoriesColumns', () => {
  beforeEach(() => {
    Object.keys(panelProps).forEach((key) => delete panelProps[key]);
  });

  it('renders all three columns', () => {
    setup();
    expect(screen.getByTestId('panel-SUPER')).toBeTruthy();
    expect(screen.getByTestId('panel-CATEGORY')).toBeTruthy();
    expect(screen.getByTestId('panel-SUB')).toBeTruthy();
  });

  it('queries SUPER with a null parent and no selection dependency', () => {
    setup();
    expect(panelProps.SUPER.parentId).toBeNull();
    expect(panelProps.SUPER.selectedId).toBeNull();
  });

  it('selecting a super category also clears the category selection', () => {
    const props = setup();
    const human = item({ id: 's1', name: 'Human', level: 'SUPER' });
    panelProps.SUPER.onSelect(human);
    expect(props.setSuperSel).toHaveBeenCalledWith(human);
    expect(props.setCatSel).toHaveBeenCalledWith(null);
  });

  it('creates, edits and deletes at SUPER level with a null parent', () => {
    const props = setup();
    panelProps.SUPER.onCreate();
    expect(props.openCreate).toHaveBeenCalledWith('SUPER', null);

    const human = item({ id: 's1', level: 'SUPER' });
    panelProps.SUPER.onEdit(human);
    expect(props.openEdit).toHaveBeenCalledWith('SUPER', null, human);

    panelProps.SUPER.onDelete(human);
    expect(props.remove).toHaveBeenCalledWith('SUPER', human);
  });

  it('scopes the CATEGORY column to the picked super category and its name', () => {
    const superSel = item({ id: 's1', name: 'Human', level: 'SUPER' });
    setup({ superSel });
    expect(panelProps.CATEGORY.parentId).toBe('s1');
    expect(panelProps.CATEGORY.parentName).toBe('Human');
  });

  it('selecting a category never touches the super selection', () => {
    const props = setup();
    const cricket = item({ id: 'c1' });
    panelProps.CATEGORY.onSelect(cricket);
    expect(props.setCatSel).toHaveBeenCalledWith(cricket);
    expect(props.setSuperSel).not.toHaveBeenCalled();
  });

  it('guards CATEGORY create/edit behind a picked super category', () => {
    const props = setup({ superSel: null });
    panelProps.CATEGORY.onCreate();
    expect(props.openCreate).not.toHaveBeenCalled();

    panelProps.CATEGORY.onEdit(item({ id: 'c1' }));
    expect(props.openEdit).not.toHaveBeenCalled();
  });

  it('creates and edits at CATEGORY level once a super category is picked', () => {
    const superSel = item({ id: 's1', level: 'SUPER' });
    const props = setup({ superSel });

    panelProps.CATEGORY.onCreate();
    expect(props.openCreate).toHaveBeenCalledWith('CATEGORY', 's1');

    const cricket = item({ id: 'c1' });
    panelProps.CATEGORY.onEdit(cricket);
    expect(props.openEdit).toHaveBeenCalledWith('CATEGORY', 's1', cricket);
  });

  it('deletes at CATEGORY level regardless of the current selection', () => {
    const props = setup();
    const cricket = item({ id: 'c1' });
    panelProps.CATEGORY.onDelete(cricket);
    expect(props.remove).toHaveBeenCalledWith('CATEGORY', cricket);
  });

  it('scopes the SUB column to the picked category, with its title hard-coded', () => {
    const catSel = item({ id: 'c1', name: 'Cricket' });
    setup({ catSel });
    expect(panelProps.SUB.title).toBe('Sub-Categories');
    expect(panelProps.SUB.parentId).toBe('c1');
    expect(panelProps.SUB.parentName).toBe('Cricket');
    // The SUB column never drives a fourth column, so it never reports a selection.
    expect(panelProps.SUB.selectedId).toBeNull();
    expect(panelProps.SUB.onSelect(item({ id: 'b1', level: 'SUB' }))).toBeUndefined();
  });

  it('guards SUB create/edit behind a picked category', () => {
    const props = setup({ catSel: null });
    panelProps.SUB.onCreate();
    expect(props.openCreate).not.toHaveBeenCalled();

    panelProps.SUB.onEdit(item({ id: 'b1', level: 'SUB' }));
    expect(props.openEdit).not.toHaveBeenCalled();
  });

  it('creates, edits and deletes at SUB level once a category is picked', () => {
    const catSel = item({ id: 'c1' });
    const props = setup({ catSel });

    panelProps.SUB.onCreate();
    expect(props.openCreate).toHaveBeenCalledWith('SUB', 'c1');

    const t20 = item({ id: 'b1', name: 'T20', level: 'SUB' });
    panelProps.SUB.onEdit(t20);
    expect(props.openEdit).toHaveBeenCalledWith('SUB', 'c1', t20);

    panelProps.SUB.onDelete(t20);
    expect(props.remove).toHaveBeenCalledWith('SUB', t20);
  });
});
