import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import HomeVibeChips from '../HomeVibeChips';
import type { VibeCategory } from '../HomeVibeChips';

// One category per icon position so VibeTab's direction map + row/column branches
// are all exercised; `plain` has no layout to cover the null (default TOP/40) path.
const categories: VibeCategory[] = [
  { id: 'top', name: 'TopCat', icon: '🔝', iconLayout: { position: 'TOP', width: 40, height: 40 }, subs: [] },
  { id: 'bottom', name: 'BottomCat', icon: '🔽', iconLayout: { position: 'BOTTOM', width: 44, height: 20 }, subs: [] },
  {
    id: 'left',
    name: 'LeftCat',
    icon: '⬅️',
    iconLayout: { position: 'LEFT', width: 50, height: 30 },
    subs: [{ id: 'left-sub', name: 'LeftSub' }],
  },
  { id: 'right', name: 'RightCat', icon: '➡️', iconLayout: { position: 'RIGHT', width: 30, height: 30 }, subs: [] },
  { id: 'plain', name: 'PlainCat', icon: null, subs: [] },
];

describe('HomeVibeChips', () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    onSelect.mockClear();
  });

  it('renders the All tab plus a tab (icon + label) for every category', () => {
    render(<HomeVibeChips categories={categories} selectedId="" onSelect={onSelect} allIcon="🌐" />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('🌐')).toBeInTheDocument();
    expect(screen.getByText('TopCat')).toBeInTheDocument();
    expect(screen.getByText('BottomCat')).toBeInTheDocument();
    expect(screen.getByText('LeftCat')).toBeInTheDocument();
    expect(screen.getByText('RightCat')).toBeInTheDocument();
    // null-layout category still renders (falls back to the default icon/look).
    expect(screen.getByText('PlainCat')).toBeInTheDocument();
    // the LEFT-positioned category's icon (row layout) renders alongside its label.
    expect(screen.getByText('⬅️')).toBeInTheDocument();
  });

  it('calls onSelect with the category id when a tab is clicked', () => {
    render(<HomeVibeChips categories={categories} selectedId="" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('LeftCat'));
    expect(onSelect).toHaveBeenCalledWith('left');
  });

  it('shows the selected category subs as chips and selects a sub on click', () => {
    render(<HomeVibeChips categories={categories} selectedId="left" onSelect={onSelect} />);
    expect(screen.getByText('All LeftCat')).toBeInTheDocument();
    const sub = screen.getByText('LeftSub');
    expect(sub).toBeInTheDocument();
    fireEvent.click(sub);
    expect(onSelect).toHaveBeenCalledWith('left-sub');
  });

  it('renders nothing when there are no categories and no action', () => {
    const { container } = render(<HomeVibeChips categories={[]} selectedId="" onSelect={onSelect} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('still renders the action slot when there are no categories', () => {
    render(
      <HomeVibeChips
        categories={[]}
        selectedId=""
        onSelect={onSelect}
        action={<span>filters-slot</span>}
      />,
    );
    expect(screen.getByText('filters-slot')).toBeInTheDocument();
  });
});
