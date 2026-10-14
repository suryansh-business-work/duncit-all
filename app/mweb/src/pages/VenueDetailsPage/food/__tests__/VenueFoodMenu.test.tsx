import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FOOD_ORDER_LIMITS, type VenueFoodItem } from '@duncit/utils';
import type { PublicVenue } from '../../queries';
import VenueFoodMenu from '../VenueFoodMenu';

const dish = (over: Partial<VenueFoodItem> = {}): VenueFoodItem => ({
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

const MENU = [
  dish(),
  dish({ id: 'samosa', name: 'Samosa', category: 'Snacks', price: 25 }),
  dish({ id: 'lassi', name: 'Lassi', price: 60, is_available: false }),
];

const venue = (over: Partial<PublicVenue> = {}): PublicVenue => ({
  id: 'v1',
  venue_name: 'Grand Hall',
  venue_type: 'Cafe',
  capacity: 40,
  description: null,
  location_id: null,
  amenities: [],
  facilities: [],
  security: [],
  cover_image_url: null,
  gallery: [],
  address_line1: null,
  address_line2: null,
  city: null,
  state: null,
  locality: null,
  postal_code: null,
  country: null,
  lat: null,
  lng: null,
  tags: [],
  offers_food: true,
  food_menu: MENU,
  food_ordering: { enabled: true, discount_pct: 0 },
  ...over,
});

const CART_KEY = 'mweb_food_cart_v1';
const storedCart = () => JSON.parse(localStorage.getItem(CART_KEY) ?? '{}');

// The finance-settings read (currency symbol) goes unanswered: the menu then
// prices in the default rupee, which is what these assertions read.
const renderMenu = (over: Partial<PublicVenue> = {}) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
      <MemoryRouter>
        <VenueFoodMenu venue={venue(over)} onRefresh={vi.fn(() => Promise.resolve())} />
      </MemoryRouter>
    </MockedProvider>,
  );

const notice = (id: string) => screen.getByTestId(`food-item-${id}-notice`);

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe('VenueFoodMenu — the cart control on a dish', () => {
  it('shows a lone "+" on each dish that can be ordered, and none on one that is off', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: 'Add Masala Chai' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Samosa' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Lassi' })).not.toBeInTheDocument();
    expect(screen.getByTestId('food-item-unavailable-lassi')).toBeInTheDocument();
    expect(screen.queryByTestId('food-item-chai-qty')).not.toBeInTheDocument();
  });

  it('adds, steps and removes a dish from the one control, keeping the stored cart in step', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Add Masala Chai' }));
    expect(screen.getByTestId('food-item-chai-qty')).toHaveTextContent('1');
    expect(notice('chai')).toHaveTextContent('Item added');
    expect(notice('samosa')).toHaveTextContent('');
    expect(storedCart()).toEqual({ chai: 1 });
    // One unit: the left button is the bin, not a minus.
    expect(screen.getByRole('button', { name: 'Remove Masala Chai' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove one Masala Chai' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add one more Masala Chai' }));
    expect(screen.getByTestId('food-item-chai-qty')).toHaveTextContent('2');
    expect(storedCart()).toEqual({ chai: 2 });

    fireEvent.click(screen.getByRole('button', { name: 'Remove one Masala Chai' }));
    expect(screen.getByTestId('food-item-chai-qty')).toHaveTextContent('1');

    fireEvent.click(screen.getByRole('button', { name: 'Remove Masala Chai' }));
    expect(screen.queryByTestId('food-item-chai-qty')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Masala Chai' })).toBeInTheDocument();
    expect(notice('chai')).toHaveTextContent('Item removed');
    expect(storedCart()).toEqual({});
  });

  it('clears the notice after a moment', () => {
    vi.useFakeTimers();
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Add Samosa' }));
    expect(notice('samosa')).toHaveTextContent('Item added');
    act(() => vi.advanceTimersByTime(1600));
    expect(notice('samosa')).toHaveTextContent('');
  });

  it('stops the plus at the most of one dish an order may hold', () => {
    localStorage.setItem(CART_KEY, JSON.stringify({ chai: FOOD_ORDER_LIMITS.maxQuantity }));
    renderMenu();
    expect(screen.getByTestId('food-item-chai-qty')).toHaveTextContent(String(FOOD_ORDER_LIMITS.maxQuantity));
    expect(screen.getByRole('button', { name: 'Add one more Masala Chai' })).toBeDisabled();
  });

  it('opens on a cart filled on an earlier visit without calling any of it "added"', () => {
    localStorage.setItem(CART_KEY, JSON.stringify({ chai: 2, samosa: 1 }));
    renderMenu();
    expect(screen.getByTestId('food-item-chai-qty')).toHaveTextContent('2');
    expect(screen.getByTestId('food-item-samosa-qty')).toHaveTextContent('1');
    expect(notice('chai')).toHaveTextContent('');
    expect(notice('samosa')).toHaveTextContent('');
  });

  it('is a menu only — no control, no cart button — when the venue does not take QR orders', () => {
    localStorage.setItem(CART_KEY, JSON.stringify({ chai: 2 }));
    renderMenu({ food_ordering: { enabled: false, discount_pct: 0 } });
    expect(screen.getByText('Masala Chai')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Masala Chai' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('food-item-chai-qty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('food-cart-bar')).not.toBeInTheDocument();
  });
});

describe('VenueFoodMenu — the floating cart button', () => {
  it('is absent, with no room kept for it, while the cart is empty', () => {
    renderMenu();
    expect(screen.queryByTestId('food-cart-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('food-cart-bar-spacer')).not.toBeInTheDocument();
  });

  it('appears with the first dish and follows the count and the total', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Add Masala Chai' }));
    const open = screen.getByTestId('food-cart-bar-open');
    expect(screen.getByTestId('food-cart-bar-count')).toHaveTextContent('1 item');
    expect(screen.getByTestId('food-cart-bar-total')).toHaveTextContent('₹40');
    expect(open).toHaveAccessibleName('View cart, 1 item, ₹40');
    // Room for the button under the last dish, so it never covers one.
    expect(screen.getByTestId('food-cart-bar-spacer')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add one more Masala Chai' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Samosa' }));
    expect(screen.getByTestId('food-cart-bar-count')).toHaveTextContent('3 items');
    expect(screen.getByTestId('food-cart-bar-total')).toHaveTextContent('₹105');
    expect(open).toHaveAccessibleName('View cart, 3 items, ₹105');
  });

  it('shows the discounted total the cart sheet will charge', () => {
    localStorage.setItem(CART_KEY, JSON.stringify({ chai: 5 }));
    renderMenu({ food_ordering: { enabled: true, discount_pct: 10 } });
    expect(screen.getByTestId('food-cart-bar-total')).toHaveTextContent('₹180');
  });

  it('adds the GST the venue charges on top, and says when its prices already include it', () => {
    localStorage.setItem(CART_KEY, JSON.stringify({ chai: 5 }));
    // 200 less 10% is 180; 5% added on top is 9.
    const { unmount } = renderMenu({ food_ordering: { enabled: true, discount_pct: 10, tax_mode: 'EXCLUSIVE', gst_pct: 5 } });
    expect(screen.getByTestId('food-cart-bar-total')).toHaveTextContent('₹189');
    fireEvent.click(screen.getByTestId('food-cart-bar-open'));
    expect(within(screen.getByTestId('food-cart-totals')).getByText('GST (5%)')).toBeInTheDocument();
    expect(screen.getByTestId('food-cart-totals-gst')).toHaveTextContent('+ ₹9');
    expect(screen.getByTestId('food-cart-totals-total')).toHaveTextContent('₹189');
    expect(screen.queryByTestId('food-cart-totals-gst-included')).not.toBeInTheDocument();
    unmount();

    // Inside the price: the bill does not move, and the GST in it is named — 180 holds 8.57 at 5%.
    renderMenu({ food_ordering: { enabled: true, discount_pct: 10, tax_mode: 'INCLUSIVE', gst_pct: 5 } });
    expect(screen.getByTestId('food-cart-bar-total')).toHaveTextContent('₹180');
    fireEvent.click(screen.getByTestId('food-cart-bar-open'));
    expect(screen.getByTestId('food-cart-totals-gst-included')).toHaveTextContent('Includes ₹8.57 GST (5%)');
    expect(screen.queryByTestId('food-cart-totals-gst')).not.toBeInTheDocument();
  });

  it('goes away again when the last dish is taken out', () => {
    localStorage.setItem(CART_KEY, JSON.stringify({ samosa: 1 }));
    renderMenu();
    expect(screen.getByTestId('food-cart-bar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Samosa' }));
    expect(screen.queryByTestId('food-cart-bar')).not.toBeInTheDocument();
  });

  it('opens the cart sheet, whose line carries the same control', () => {
    localStorage.setItem(CART_KEY, JSON.stringify({ chai: 2 }));
    renderMenu();
    expect(screen.queryByTestId('food-cart-line-chai')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('food-cart-bar-open'));
    const line = within(screen.getByTestId('food-cart-line-chai'));
    expect(line.getByTestId('food-cart-line-chai-qty')).toHaveTextContent('2');

    fireEvent.click(line.getByRole('button', { name: 'Add one more Masala Chai' }));
    expect(line.getByTestId('food-cart-line-chai-qty')).toHaveTextContent('3');
    // The menu card behind the sheet is the same cart.
    expect(screen.getByTestId('food-item-chai-qty')).toHaveTextContent('3');
    expect(screen.getByTestId('food-cart-bar-total')).toHaveTextContent('₹120');

    fireEvent.click(line.getByRole('button', { name: 'Remove one Masala Chai' }));
    expect(storedCart()).toEqual({ chai: 2 });
  });
});
