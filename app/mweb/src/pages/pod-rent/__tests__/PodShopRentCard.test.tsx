import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

// The bottom sheet stays mounted with every row, so the card's own preview is the one that shows the first rows.
const preview = (testId: string) => screen.getAllByTestId(testId).find((el) => el.textContent === 'first 2');

describe('PodShopRentCard', () => {
  it('shows the first rows of the shop inside a capped, scrolling panel', () => {
    const renderShop = renderCard();
    expect(renderShop).toHaveBeenCalledWith(2);
    const shop = preview('shop-list');
    expect(shop).toBeDefined();
    expect(shop?.parentElement).toHaveStyle({ maxHeight: '360px', overflowY: 'auto' });
  });

  it('caps the rent panel the same way when the pod sells nothing', () => {
    renderCard(false);
    const rent = preview('rent-list');
    expect(rent).toBeDefined();
    expect(rent?.parentElement).toHaveStyle({ maxHeight: '360px', overflowY: 'auto' });
  });

  it('keeps See all, which opens every product in the sheet', async () => {
    renderCard();
    // The closed sheet is mounted but hidden; See all is what shows it.
    expect(screen.getByText('every product')).not.toBeVisible();
    fireEvent.click(screen.getByTestId('pod-shop-rent-see-all'));
    await waitFor(() => expect(screen.getByText('every product')).toBeVisible());
  });
});
