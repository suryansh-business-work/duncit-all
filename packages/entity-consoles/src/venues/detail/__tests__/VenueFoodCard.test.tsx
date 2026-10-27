import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import VenueFoodCard from '../VenueFoodCard';
import type { VenueFoodItem } from '../queries';
import { makeVenue } from './fixtures';

const dish = (over: Partial<VenueFoodItem> = {}): VenueFoodItem => ({
  id: 'd1',
  name: 'Paneer tikka',
  description: '',
  category: 'Starters',
  price: 280,
  images: [],
  diet: 'VEG',
  spice_level: 'MEDIUM',
  is_available: true,
  ...over,
});

const ordering = (over: Partial<ReturnType<typeof makeVenue>['food_ordering']> = {}) => ({
  ...makeVenue().food_ordering,
  ...over,
});

describe('VenueFoodCard', () => {
  it('says the venue does not offer food, and draws nothing else', () => {
    render(<VenueFoodCard venue={makeVenue({ offers_food: false })} />);
    expect(screen.getByText('Does not offer food')).toBeInTheDocument();
    expect(screen.queryByText('QR ordering')).not.toBeInTheDocument();
    expect(screen.queryByText('Menu')).not.toBeInTheDocument();
  });

  it('reads QR ordering as on with its discount, and says when the menu is empty', () => {
    render(
      <VenueFoodCard
        venue={makeVenue({ offers_food: true, food_menu: [], food_ordering: ordering({ enabled: true, discount_pct: 15 }) })}
      />,
    );
    expect(screen.getByText('QR ordering').parentElement).toHaveTextContent('On');
    expect(screen.getByText('Discount on QR orders').parentElement).toHaveTextContent('15%');
    expect(screen.getByText('No dishes listed yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Menu' })).not.toBeInTheDocument();
  });

  it('reads QR ordering as off when the venue has not switched it on', () => {
    render(<VenueFoodCard venue={makeVenue({ offers_food: true, food_ordering: ordering({ enabled: false }) })} />);
    expect(screen.getByText('QR ordering').parentElement).toHaveTextContent('Off');
  });

  it('lists each dish with its facts, availability and price — paise only when it has them', () => {
    render(
      <VenueFoodCard
        venue={makeVenue({
          offers_food: true,
          food_menu: [
            dish(),
            dish({
              id: 'd2',
              name: 'Egg roll',
              category: '',
              price: 99.5,
              diet: 'EGG',
              spice_level: 'EXTRA_HOT',
              is_available: false,
              images: ['https://img.test/roll.jpg'],
            }),
          ],
        })}
      />,
    );
    const items = within(screen.getByRole('list', { name: 'Menu' })).getAllByRole('listitem');
    expect(items).toHaveLength(2);

    expect(within(items[0]).getByText('Paneer tikka')).toBeInTheDocument();
    expect(within(items[0]).getByText('Starters · Vegetarian · Medium')).toBeInTheDocument();
    expect(within(items[0]).getByText('Available')).toBeInTheDocument();
    expect(within(items[0]).getByText('₹280')).toBeInTheDocument();

    // A blank section is skipped rather than leaving a stray separator.
    expect(within(items[1]).getByText('Contains egg · Extra hot')).toBeInTheDocument();
    expect(within(items[1]).getByText('Unavailable')).toBeInTheDocument();
    expect(within(items[1]).getByText('₹99.50')).toBeInTheDocument();
  });

  it('keeps a diet or spice level it has no label for as the server sent it', () => {
    render(
      <VenueFoodCard
        venue={makeVenue({
          offers_food: true,
          food_menu: [dish({ diet: 'JAIN' as VenueFoodItem['diet'], spice_level: 'SMOKY' as VenueFoodItem['spice_level'] })],
        })}
      />,
    );
    expect(screen.getByText('Starters · JAIN · SMOKY')).toBeInTheDocument();
  });
});
