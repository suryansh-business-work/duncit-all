import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { groupFoodMenu, type VenueFoodItem } from '@duncit/utils';
import FoodMenuBrowser from '../FoodMenuBrowser';

const dish = (over: Partial<VenueFoodItem>): VenueFoodItem => ({
  id: 'chai',
  name: 'Masala Chai',
  description: '',
  category: 'Drinks',
  price: 40,
  images: [],
  diet: 'VEG',
  spice_level: 'NONE',
  is_available: true,
  ...over,
});

const SECTIONED = [
  dish({ id: 'chai', name: 'Masala Chai', description: 'Ginger and cardamom', category: 'Drinks' }),
  dish({ id: 'lassi', name: 'Sweet Lassi', category: 'Drinks', price: 60 }),
  dish({ id: 'samosa', name: 'Samosa', category: 'Snacks', price: 25 }),
  dish({ id: 'cookie', name: 'Oat Cookie', category: '', price: 30 }),
];

function renderBrowser(menu: VenueFoodItem[] = SECTIONED) {
  return render(
    <MemoryRouter>
      <FoodMenuBrowser
        venueId="v1"
        groups={groupFoodMenu(menu)}
        currency="₹"
        canOrder
        quantityOf={() => 0}
        onQuantity={vi.fn()}
        onOpenImage={vi.fn()}
      />
    </MemoryRouter>,
  );
}

/** The section's fold button (MUI puts the summary in an h3 with aria-expanded). */
const summary = (index: number) => within(screen.getByTestId(`food-menu-section-${index}`)).getAllByRole('button')[0];
const isOpen = (index: number) => summary(index).getAttribute('aria-expanded') === 'true';
const search = (value: string) => fireEvent.change(screen.getByTestId('venue-food-search-input'), { target: { value } });
const toggleAll = () => screen.getByTestId('venue-food-toggle-all');

describe('FoodMenuBrowser — sections', () => {
  it('folds a categorised menu into open sections named with their dish count, the loose dishes under "More dishes"', () => {
    renderBrowser();
    expect(summary(0)).toHaveTextContent('Drinks');
    expect(summary(0)).toHaveTextContent('2 items');
    expect(summary(1)).toHaveTextContent('Snacks');
    expect(summary(1)).toHaveTextContent('1 items');
    expect(summary(2)).toHaveTextContent('More dishes');
    expect([0, 1, 2].every(isOpen)).toBe(true);
    // Each summary controls its own region.
    expect(summary(0)).toHaveAttribute('aria-controls', 'food-menu-section-0-content');
    expect(within(screen.getByTestId('food-menu-section-2')).getByText('Oat Cookie')).toBeInTheDocument();
  });

  it('folds and reopens one section without touching the others', () => {
    renderBrowser();
    fireEvent.click(summary(1));
    expect(isOpen(1)).toBe(false);
    expect(isOpen(0)).toBe(true);
    expect(isOpen(2)).toBe(true);
    // Not every section is open any more, so the button offers to open them all.
    expect(toggleAll()).toHaveTextContent('Expand all');
    fireEvent.click(summary(1));
    expect(isOpen(1)).toBe(true);
    expect(toggleAll()).toHaveTextContent('Collapse all');
  });

  it('collapses every section, then expands every section, from the one button', () => {
    renderBrowser();
    expect(toggleAll()).toHaveTextContent('Collapse all');
    fireEvent.click(toggleAll());
    expect([0, 1, 2].some(isOpen)).toBe(false);
    expect(toggleAll()).toHaveTextContent('Expand all');
    fireEvent.click(toggleAll());
    expect([0, 1, 2].every(isOpen)).toBe(true);
  });

  it('opens every remaining section when one was folded and "Expand all" is pressed', () => {
    renderBrowser();
    fireEvent.click(summary(0));
    fireEvent.click(toggleAll());
    expect([0, 1, 2].every(isOpen)).toBe(true);
  });

  it('shows a menu with no categories as one plain list — no sections, no expand button', () => {
    renderBrowser([dish({ id: 'a', name: 'Idli', category: '' }), dish({ id: 'b', name: 'Vada', category: '  ' })]);
    expect(screen.queryByTestId('food-menu-section-0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('venue-food-toggle-all')).not.toBeInTheDocument();
    expect(screen.queryByText('More dishes')).not.toBeInTheDocument();
    const list = screen.getByTestId('food-menu-list');
    expect(within(list).getByText('Idli')).toBeInTheDocument();
    expect(within(list).getByText('Vada')).toBeInTheDocument();
  });

  it('links each dish name to the dish’s own page', () => {
    renderBrowser();
    expect(screen.getByTestId('food-item-open-chai')).toHaveAttribute('href', '/venue/v1/food/chai');
    expect(screen.getByRole('link', { name: 'Samosa' })).toHaveAttribute('href', '/venue/v1/food/samosa');
  });
});

describe('FoodMenuBrowser — search', () => {
  it('is a labelled search box', () => {
    renderBrowser();
    const input = screen.getByRole('textbox', { name: 'Search the menu' });
    expect(input).toHaveAttribute('placeholder', 'Search dishes');
    // No clear button until something is typed.
    expect(screen.queryByTestId('venue-food-search-clear')).not.toBeInTheDocument();
  });

  it('narrows the menu to dishes whose name or description has every word, dropping emptied sections', () => {
    renderBrowser();
    search('ginger');
    expect(screen.getByText('Masala Chai')).toBeInTheDocument();
    expect(screen.queryByText('Sweet Lassi')).not.toBeInTheDocument();
    expect(screen.queryByText('Samosa')).not.toBeInTheDocument();
    expect(summary(0)).toHaveTextContent('1 items');
    expect(screen.queryByTestId('food-menu-section-1')).not.toBeInTheDocument();

    search('SWEET lassi');
    expect(screen.getByText('Sweet Lassi')).toBeInTheDocument();
    expect(screen.queryByText('Masala Chai')).not.toBeInTheDocument();
  });

  it('opens every folded section as soon as a search has words, so no match hides in one', () => {
    renderBrowser();
    fireEvent.click(toggleAll());
    expect([0, 1, 2].some(isOpen)).toBe(false);
    search('s');
    const shown = screen.getAllByTestId(/^food-menu-section-\d+$/);
    expect(shown.length).toBeGreaterThan(0);
    shown.forEach((_, index) => expect(isOpen(index)).toBe(true));
  });

  it('leaves the folds alone for a blank search', () => {
    renderBrowser();
    fireEvent.click(summary(1));
    search('   ');
    expect(isOpen(1)).toBe(false);
    expect(isOpen(0)).toBe(true);
  });

  it('says nothing matched, quoting the search, and hides the expand button', () => {
    renderBrowser();
    search('  pizza  ');
    const empty = screen.getByTestId('venue-food-search-empty');
    expect(empty).toHaveAttribute('role', 'status');
    expect(empty).toHaveTextContent('No dishes match "pizza".');
    expect(screen.queryByTestId('food-menu-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('venue-food-toggle-all')).not.toBeInTheDocument();
  });

  it('clears the search from its button, bringing the whole menu back', () => {
    renderBrowser();
    search('pizza');
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByTestId('venue-food-search-input')).toHaveValue('');
    expect(screen.queryByTestId('venue-food-search-clear')).not.toBeInTheDocument();
    expect(screen.getByText('Masala Chai')).toBeInTheDocument();
    expect(screen.getByText('Oat Cookie')).toBeInTheDocument();
  });
});
