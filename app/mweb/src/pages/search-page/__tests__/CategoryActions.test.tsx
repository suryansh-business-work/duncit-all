import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SuperCategoryGroup } from '@duncit/utils';
import CategoryActions from '../CategoryActions';
import type { SearchCategory } from '../useSearchDiscovery';

const cat = (id: string, name: string, level: string, icon?: string | null): SearchCategory => ({
  id,
  name,
  slug: id,
  level,
  icon,
});

const GROUPS: SuperCategoryGroup<SearchCategory>[] = [
  {
    superCategory: cat('sup-you', 'For You', 'SUPER', '🙂'),
    categories: [
      cat('cat-sports', 'Sports', 'CATEGORY', 'https://cdn.example/sports.png'),
      cat('cat-music', 'Music', 'CATEGORY', '🎵'),
    ],
  },
  {
    superCategory: cat('sup-pet', 'For Your Pet', 'SUPER', null),
    categories: [cat('cat-walks', 'Dog Walks', 'CATEGORY', null)],
  },
];

describe('CategoryActions — the default search landing', () => {
  it('tells the user categories are coming when there are none yet', () => {
    render(<CategoryActions groups={[]} onSelect={vi.fn()} />);

    expect(screen.getByTestId('category-actions-header')).toHaveTextContent('Discover Experiences by Interest');
    expect(screen.getByTestId('category-actions-empty')).toHaveTextContent(
      'Categories are on their way — check back soon.',
    );
    expect(screen.queryByTestId('category-actions-grid')).not.toBeInTheDocument();
  });

  it('groups the tiles under a section named by each super category heading', () => {
    render(<CategoryActions groups={GROUPS} onSelect={vi.fn()} />);

    expect(screen.queryByTestId('category-actions-empty')).not.toBeInTheDocument();
    const forYou = screen.getByRole('region', { name: 'For You' });
    expect(forYou).toBe(screen.getByTestId('category-actions-group-sup-you'));
    expect(within(forYou).getByRole('heading', { level: 3, name: 'For You' })).toBeInTheDocument();
    expect(within(forYou).getAllByRole('button').map((b) => b.textContent)).toEqual(['Sports', '🎵Music']);

    const forPet = screen.getByRole('region', { name: 'For Your Pet' });
    expect(within(forPet).getAllByRole('button')).toHaveLength(1);
    expect(within(forPet).getByText('Dog Walks')).toBeInTheDocument();
  });

  it('shows the admin’s image as the tile mark and the generic category icon when there is none', () => {
    render(<CategoryActions groups={GROUPS} onSelect={vi.fn()} />);

    const sports = screen.getByTestId('category-actions-item-cat-sports');
    expect(sports.querySelector('img')).toHaveAttribute('src', 'https://cdn.example/sports.png');
    expect(within(sports).queryByTestId('CategoryOutlinedIcon')).not.toBeInTheDocument();

    const walks = screen.getByTestId('category-actions-item-cat-walks');
    expect(walks.querySelector('img')).toBeNull();
    expect(within(walks).getByTestId('CategoryOutlinedIcon')).toBeInTheDocument();
  });

  it('hands the tapped category id back to the search page', () => {
    const onSelect = vi.fn();
    render(<CategoryActions groups={GROUPS} onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId('category-actions-item-cat-music'));
    fireEvent.click(screen.getByTestId('category-actions-item-cat-walks'));

    expect(onSelect.mock.calls).toEqual([['cat-music'], ['cat-walks']]);
  });
});
