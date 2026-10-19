import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import PodShopRentCard from '../PodShopRentCard';
import type { PodRentals } from '../usePodRentals';

// The list itself has its own data and rules; this suite is about the card's frame.
vi.mock('../PodRentList', () => ({
  default: ({ limit }: Readonly<{ limit?: number }>) => <p data-testid="rent-list">{limit ? `first ${limit}` : 'every item'}</p>,
}));

const rentals: PodRentals = { catalogue: null, settings: null, loading: false, error: null, refetch: vi.fn() };
const picks = { picks: {}, setQuantity: vi.fn(), clear: vi.fn() };

function renderCard(hasProducts = true) {
  const renderShop = vi.fn((limit?: number) => <p data-testid="shop-list">{limit ? `first ${limit}` : 'every product'}</p>);
  render(
    <MemoryRouter>
      <PodShopRentCard podTitle="Sunday Run" hasProducts={hasProducts} renderShop={renderShop} rentals={rentals} picks={picks} seats={1} />
    </MemoryRouter>,
  );
  return renderShop;
}

describe('PodShopRentCard', () => {
  it('shows the first rows of the shop inside a capped, scrolling panel', () => {
    const renderShop = renderCard();
    expect(renderShop).toHaveBeenCalledWith(2);
    const shop = screen.getByTestId('shop-list');
    expect(shop).toHaveTextContent('first 2');
    expect(shop.parentElement).toHaveStyle({ maxHeight: '360px', overflowY: 'auto' });
  });

  it('caps the rent panel the same way when the pod sells nothing', () => {
    renderCard(false);
    const rent = screen.getByTestId('rent-list');
    expect(rent).toHaveTextContent('first 2');
    expect(rent.parentElement).toHaveStyle({ maxHeight: '360px', overflowY: 'auto' });
  });

  it('keeps See all, which opens every product in the sheet', () => {
    renderCard();
    fireEvent.click(screen.getByTestId('pod-shop-rent-see-all'));
    expect(screen.getByText('every product')).toBeInTheDocument();
  });
});
