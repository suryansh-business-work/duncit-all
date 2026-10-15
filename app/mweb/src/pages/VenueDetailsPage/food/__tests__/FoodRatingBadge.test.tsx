import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { logs } from '@duncit/logs';
import FoodRatingBadge from '../FoodRatingBadge';
import { VENUE_FOOD_RATING } from '../queries';

const rating = (average: number, count: number): MockedResponse => ({
  request: { query: VENUE_FOOD_RATING, variables: { venueId: 'v1' } },
  result: { data: { venueFoodRating: { venue_id: 'v1', average, count } } },
});

const renderBadge = (mocks: MockedResponse[], venueId = 'v1') =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <FoodRatingBadge venueId={venueId} />
    </MockedProvider>,
  );

afterEach(() => vi.restoreAllMocks());

describe('FoodRatingBadge', () => {
  it('shows the venue’s food rating to one decimal with the number of ratings, named for a screen reader', async () => {
    renderBadge([rating(4.26, 12)]);
    const badge = await screen.findByTestId('venue-food-rating');
    expect(badge).toHaveTextContent('4.3 (12)');
    expect(badge).toHaveAttribute('role', 'img');
    expect(badge).toHaveAccessibleName('Food rated 4.3 out of 5 by 12 guests');
  });

  it('keeps a whole-number average at one decimal', async () => {
    renderBadge([rating(5, 1)]);
    expect(await screen.findByTestId('venue-food-rating')).toHaveTextContent('5.0 (1)');
  });

  it('shows nothing until somebody has rated — no rating is not a score of zero', async () => {
    const asked = vi.fn(() => true);
    renderBadge([
      {
        request: { query: VENUE_FOOD_RATING, variables: asked },
        result: { data: { venueFoodRating: { venue_id: 'v1', average: 0, count: 0 } } },
      },
    ]);
    await waitFor(() => expect(asked).toHaveBeenCalled());
    // Let the answer land before asserting it drew nothing.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByTestId('venue-food-rating')).not.toBeInTheDocument();
  });

  it('stays out of the menu’s way when the rating cannot be read, and logs why', async () => {
    const warn = vi.spyOn(logs.mWeb, 'warn').mockImplementation(() => undefined);
    renderBadge([
      { request: { query: VENUE_FOOD_RATING, variables: { venueId: 'v1' } }, error: new Error('Network down') },
    ]);
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith('venueFood', 'rating', expect.objectContaining({ venueId: 'v1' })),
    );
    expect(screen.queryByTestId('venue-food-rating')).not.toBeInTheDocument();
  });

  it('asks nothing without a venue', () => {
    const asked = vi.fn(() => true);
    renderBadge([{ request: { query: VENUE_FOOD_RATING, variables: asked }, result: { data: null } }], '');
    expect(asked).not.toHaveBeenCalled();
    expect(screen.queryByTestId('venue-food-rating')).not.toBeInTheDocument();
  });
});
