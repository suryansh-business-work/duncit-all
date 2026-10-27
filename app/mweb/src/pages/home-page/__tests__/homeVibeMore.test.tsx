import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import HomeVibeChips, { type VibeCategory } from '../HomeVibeChips';

const categories: VibeCategory[] = [
  { id: 'sports', name: 'Sports', icon: null, subs: [{ id: 'run', name: 'Running', icon: '🏃' }, { id: 'yoga', name: 'Yoga', icon: null }] },
  { id: 'arts', name: 'Arts', icon: null, subs: [] },
];

const onSelect = vi.fn();
beforeEach(() => onSelect.mockClear());

describe('HomeVibeChips selection', () => {
  it('shows the sub-category icon circle only for a sub with an icon', () => {
    render(<HomeVibeChips categories={categories} selectedId="sports" onSelect={onSelect} />);
    expect(screen.getByTestId('vibe-sub-run-icon')).toHaveTextContent('🏃');
    expect(screen.queryByTestId('vibe-sub-yoga-icon')).not.toBeInTheDocument();
  });

  it('deselects a selected category when it is tapped again, and selects another otherwise', () => {
    render(<HomeVibeChips categories={categories} selectedId="sports" onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('vibe-chip-sports'));
    expect(onSelect).toHaveBeenLastCalledWith('');
    fireEvent.click(screen.getByTestId('vibe-chip-arts'));
    expect(onSelect).toHaveBeenLastCalledWith('arts');
    fireEvent.click(screen.getByTestId('vibe-chip-all'));
    expect(onSelect).toHaveBeenLastCalledWith('');
  });

  it('falls back to the whole category when a selected sub-category is tapped again', () => {
    render(<HomeVibeChips categories={categories} selectedId="run" onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('vibe-sub-run'));
    expect(onSelect).toHaveBeenLastCalledWith('sports');
    fireEvent.click(screen.getByTestId('vibe-sub-yoga'));
    expect(onSelect).toHaveBeenLastCalledWith('yoga');
    fireEvent.click(screen.getByTestId('vibe-sub-all-sports'));
    expect(onSelect).toHaveBeenLastCalledWith('sports');
  });

  it('keeps the category highlighted while one of its sub-categories is selected', () => {
    render(<HomeVibeChips categories={categories} selectedId="yoga" onSelect={onSelect} />);
    expect(screen.getByTestId('vibe-sub-yoga')).toHaveClass('MuiChip-colorPrimary');
    expect(screen.getByTestId('vibe-sub-run')).not.toHaveClass('MuiChip-colorPrimary');
  });

  it('shows only the action when there are no categories', () => {
    render(<HomeVibeChips categories={[]} selectedId="" onSelect={onSelect} action={<button data-testid="act" />} />);
    expect(screen.getByTestId('act')).toBeInTheDocument();
    expect(screen.queryByTestId('vibe-chip-all')).not.toBeInTheDocument();
  });
});
