import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CanvasToolbar from '../../../../src/pages/region-structure/CanvasToolbar';

const renderToolbar = (props: { search?: string; direction?: 'LR' | 'TB'; hits?: number } = {}) => {
  const onSearch = vi.fn();
  const onDirection = vi.fn();
  render(
    <CanvasToolbar
      search={props.search ?? ''}
      onSearch={onSearch}
      direction={props.direction ?? 'LR'}
      onDirection={onDirection}
      hits={props.hits ?? 0}
      total={6}
    />,
  );
  return { onSearch, onDirection };
};

const searchField = () => screen.getByRole('textbox', { name: 'Search the canvas' });

describe('CanvasToolbar', () => {
  it('explains the search until something is typed, with nothing to clear', () => {
    renderToolbar();
    expect(screen.getByText('Type a name, a city or a locality — matches stay lit, the rest dims.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
    expect(screen.queryByText(/boxes match/)).not.toBeInTheDocument();
  });

  it('reports every keystroke', () => {
    const { onSearch } = renderToolbar();
    fireEvent.change(searchField(), { target: { value: 'Koramangala' } });
    expect(onSearch).toHaveBeenCalledWith('Koramangala');
  });

  it('counts the matches while searching, and clears in one click', () => {
    const { onSearch } = renderToolbar({ search: 'rohan', hits: 1 });
    expect(searchField()).toHaveValue('rohan');
    expect(screen.getByText('1 of 6 boxes match')).toBeInTheDocument();
    expect(screen.queryByText(/matches stay lit/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onSearch).toHaveBeenCalledWith('');
  });

  it('switches the tree to run top to bottom', () => {
    const { onDirection } = renderToolbar({ direction: 'LR' });
    expect(screen.getByRole('button', { name: 'Horizontal' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Vertical' }));
    expect(onDirection).toHaveBeenCalledWith('TB');
  });

  it('keeps the current orientation when its own button is pressed again', () => {
    const { onDirection } = renderToolbar({ direction: 'TB' });
    fireEvent.click(screen.getByRole('button', { name: 'Vertical' }));
    expect(onDirection).not.toHaveBeenCalled();
  });
});
