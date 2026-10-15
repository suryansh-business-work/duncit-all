import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logs } from '@duncit/logs';
import type { VenueFoodItem } from '@duncit/utils';
import VenueFoodItemPage from '..';
import { PUBLIC_VENUE } from '../../VenueDetailsPage/queries';

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => mockNavigate,
}));

const dish = (over: Partial<VenueFoodItem> = {}): VenueFoodItem => ({
  id: 'chai',
  name: 'Masala Chai',
  description: 'Ginger and cardamom',
  category: 'Drinks',
  price: 40,
  images: ['https://img.test/chai-1.jpg', 'https://img.test/chai-2.jpg'],
  diet: 'VEG',
  spice_level: 'NONE',
  is_available: true,
  videos: [],
  original_price: 50,
  saving_display: 'PERCENT',
  ...over,
});

// Every field PUBLIC_VENUE selects, so the answer lands in the cache whole.
const venue = (over: Record<string, unknown> = {}) => ({
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
  videos: [],
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
  food_menu: [dish(), dish({ id: 'lassi', name: 'Lassi', images: [], original_price: null, saving_display: null })],
  food_licences: null,
  food_ordering: { enabled: true, discount_pct: 0, tax_mode: 'INCLUSIVE', gst_pct: 0 },
  ...over,
});

const venueMock = (publicVenue: unknown): MockedResponse => ({
  request: { query: PUBLIC_VENUE, variables: { venueId: 'v1' } },
  result: { data: { publicVenue } },
});

const renderPage = (mocks: MockedResponse[], path = '/venue/v1/food/chai') =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/venue/:venueId/food/:itemId" element={<VenueFoodItemPage />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  mockNavigate.mockReset();
  // The rating read goes unanswered here; its warning is not what these tests are about.
  vi.spyOn(logs.mWeb, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('VenueFoodItemPage', () => {
  it('shows a loading placeholder while the venue is read', () => {
    renderPage([venueMock(venue())]);
    expect(screen.getByTestId('food-item-loading')).toHaveAttribute('role', 'progressbar');
    expect(screen.getByTestId('food-item-header-title')).toHaveTextContent('Dish details');
  });

  it('shows the dish — name, price with the struck original, description, photos — and the way back to the menu', async () => {
    renderPage([venueMock(venue())]);
    const details = await screen.findByTestId('food-item-details-chai');
    expect(screen.getByRole('heading', { level: 2, name: 'Masala Chai' })).toBeInTheDocument();
    expect(screen.getByTestId('food-item-price-chai')).toHaveTextContent('₹40');
    expect(screen.getByTestId('food-item-original-price-chai')).toHaveTextContent('₹50');
    expect(screen.getByTestId('food-item-saving-chai')).toHaveTextContent('20% off');
    expect(details).toHaveTextContent('Ginger and cardamom');
    // Two photos: the cover and a strip of thumbnails, each opening the viewer.
    expect(screen.getByTestId('food-item-thumbs')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'View the photo of Masala Chai' })).toHaveLength(3);
    expect(screen.getByTestId('food-item-back-to-menu')).toHaveAttribute('href', '/venue/v1');
  });

  it('adds the dish to the same per-venue cart the menu uses', async () => {
    renderPage([venueMock(venue())]);
    fireEvent.click(await screen.findByRole('button', { name: 'Add Masala Chai' }));
    expect(screen.getByTestId('food-item-details-chai-qty')).toHaveTextContent('1');
    expect(JSON.parse(localStorage.getItem('mweb_food_cart_v1') ?? '{}')).toEqual({ chai: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Add one more Masala Chai' }));
    expect(JSON.parse(localStorage.getItem('mweb_food_cart_v1') ?? '{}')).toEqual({ chai: 2 });
  });

  it('shows a plain placeholder, with nothing to open, for a dish without photos', async () => {
    renderPage([venueMock(venue())], '/venue/v1/food/lassi');
    const details = await screen.findByTestId('food-item-details-lassi');
    expect(screen.getByRole('heading', { level: 2, name: 'Lassi' })).toBeInTheDocument();
    expect(details.querySelector('img')).toBeNull();
    expect(screen.queryByRole('button', { name: 'View the photo of Lassi' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('food-item-thumbs')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Lassi' })).toBeInTheDocument();
  });

  it('opens the viewer on the photo pressed in the strip', async () => {
    renderPage([venueMock(venue())]);
    await screen.findByTestId('food-item-details-chai');
    const [, , second] = screen.getAllByRole('button', { name: 'View the photo of Masala Chai' });
    fireEvent.click(second);
    expect(await screen.findByTestId('moment-lightbox-media')).toHaveAttribute('src', 'https://img.test/chai-2.jpg');
  });

  it('opens on the quantity already in the cart from the menu', async () => {
    localStorage.setItem('mweb_food_cart_v1', JSON.stringify({ chai: 3 }));
    renderPage([venueMock(venue())]);
    expect(await screen.findByTestId('food-item-details-chai-qty')).toHaveTextContent('3');
  });

  it('labels a dish that is off for now and offers no add control', async () => {
    renderPage([venueMock(venue({ food_menu: [dish({ is_available: false })] }))]);
    expect(await screen.findByTestId('food-item-details-unavailable')).toHaveTextContent('Unavailable');
    expect(screen.queryByRole('button', { name: 'Add Masala Chai' })).not.toBeInTheDocument();
  });

  it('is a menu page only — no add control — when the venue takes no QR orders', async () => {
    renderPage([venueMock(venue({ food_ordering: { enabled: false, discount_pct: 0, tax_mode: 'INCLUSIVE', gst_pct: 0 } }))]);
    await screen.findByTestId('food-item-details-chai');
    expect(screen.queryByRole('button', { name: 'Add Masala Chai' })).not.toBeInTheDocument();
  });

  it('says the dish is no longer on the menu, with the way back, for an unknown dish', async () => {
    renderPage([venueMock(venue())], '/venue/v1/food/gone');
    expect(await screen.findByTestId('food-item-missing')).toHaveTextContent('This dish is no longer on the menu.');
    expect(screen.getByTestId('food-item-back-to-menu')).toHaveAttribute('href', '/venue/v1');
    expect(screen.queryByTestId('food-item-details-gone')).not.toBeInTheDocument();
  });

  it('treats a venue that no longer serves food, or is not public, as not found', async () => {
    const { unmount } = renderPage([venueMock(venue({ offers_food: false }))]);
    expect(await screen.findByTestId('food-item-missing')).toBeInTheDocument();
    unmount();
    renderPage([venueMock(null)]);
    expect(await screen.findByTestId('food-item-missing')).toBeInTheDocument();
  });

  it('says the dish could not be loaded, and reads again on Try again', async () => {
    renderPage([
      { request: { query: PUBLIC_VENUE, variables: { venueId: 'v1' } }, error: new Error('Network down') },
      venueMock(venue()),
    ]);
    const failed = await screen.findByTestId('food-item-load-failed');
    expect(failed).toHaveTextContent('This dish could not be loaded.');
    // A failed read is not "no longer on the menu".
    expect(screen.queryByTestId('food-item-missing')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('food-item-details-chai')).toBeInTheDocument();
  });

  it('goes back to the venue’s menu from the header', async () => {
    renderPage([venueMock(venue())]);
    await screen.findByTestId('food-item-details-chai');
    fireEvent.click(screen.getByTestId('food-item-header-back'));
    expect(mockNavigate).toHaveBeenCalledWith('/venue/v1');
  });
});
