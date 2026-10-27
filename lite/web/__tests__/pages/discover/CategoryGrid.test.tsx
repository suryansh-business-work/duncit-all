import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CategoryGrid } from '../../../pages/discover/CategoryGrid';
import { categoryFixture, renderWithProviders } from '../../test-utils';

const categories = [
  categoryFixture({ id: 'c1', name: 'Music', slug: 'music', icon: 'MusicNote', events_count: 1 }),
  categoryFixture({ id: 'c2', name: 'Tech', slug: 'tech', icon: 'Code', events_count: 12 }),
  categoryFixture({ id: 'c3', name: 'Other', slug: 'other', icon: null, events_count: undefined }),
];

describe('CategoryGrid', () => {
  it('lists every category as a link to its page, with its event count', () => {
    renderWithProviders(<CategoryGrid categories={categories} />);
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(3);

    expect(screen.getByTestId('category-music')).toHaveAttribute('href', '/category/music');
    expect(within(items[0]).getByText('1 event')).toBeInTheDocument();
    expect(within(items[1]).getByText('12 events')).toBeInTheDocument();
    expect(within(items[2]).getByText('0 events')).toBeInTheDocument();
  });

  it('keeps the glyphs away from assistive technology', () => {
    renderWithProviders(<CategoryGrid categories={categories} />);
    const link = screen.getByTestId('category-tech');
    expect(link.querySelector('[aria-hidden="true"] svg')).not.toBeNull();
    expect(link).toHaveTextContent('Tech');
  });

  it('shows just the names when counts are switched off', () => {
    renderWithProviders(<CategoryGrid categories={categories} showCounts={false} />);
    expect(screen.getByText('Music')).toBeInTheDocument();
    expect(screen.queryByText('1 event')).not.toBeInTheDocument();
    expect(screen.queryByText('12 events')).not.toBeInTheDocument();
  });

  it('renders an empty list for no categories', () => {
    renderWithProviders(<CategoryGrid categories={[]} />);
    expect(screen.getByTestId('category-grid')).toBeEmptyDOMElement();
  });
});
