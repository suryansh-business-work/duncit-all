import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ClubCategoryChips from '../ClubCategoryChips';
import type { SearchCategory } from '../../search-page/useSearchDiscovery';

const categories: SearchCategory[] = [
  { id: 'c1', name: 'Nightlife', slug: 'nightlife', level: 'CATEGORY', parent_id: null },
  { id: 'c2', name: 'Sports', slug: 'sports', level: 'CATEGORY', parent_id: null },
];

describe('ClubCategoryChips', () => {
  it('renders nothing when there are no categories', () => {
    const { container } = render(
      <ClubCategoryChips categories={[]} selectedId="" onSelect={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders an All chip followed by every category', () => {
    render(<ClubCategoryChips categories={categories} selectedId="" onSelect={() => {}} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Nightlife')).toBeInTheDocument();
    expect(screen.getByText('Sports')).toBeInTheDocument();
  });

  it('marks the selected chip as filled primary and others outlined', () => {
    render(<ClubCategoryChips categories={categories} selectedId="c1" onSelect={() => {}} />);
    expect(screen.getByText('Nightlife').closest('.MuiChip-root')).toHaveClass(
      'MuiChip-colorPrimary',
    );
    expect(screen.getByText('Sports').closest('.MuiChip-root')).toHaveClass('MuiChip-outlined');
    expect(screen.getByText('All').closest('.MuiChip-root')).toHaveClass('MuiChip-outlined');
  });

  it('selects a category on tap and clears it via the All chip', () => {
    const onSelect = vi.fn();
    render(<ClubCategoryChips categories={categories} selectedId="c2" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Nightlife'));
    expect(onSelect).toHaveBeenCalledWith('c1');
    fireEvent.click(screen.getByText('All'));
    expect(onSelect).toHaveBeenCalledWith('');
  });
});
