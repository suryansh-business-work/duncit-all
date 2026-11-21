import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VenueHostTerms } from '@duncit/utils';

const navigate = vi.fn();
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}));
vi.mock('../../../hooks/usePricing', () => ({ usePricing: () => ({ currency: '₹' }) }));

import VenueHostTermsCard from '../VenueHostTermsCard';
import { VENUE_HOST_TERMS } from '../../../hooks/useVenueHostTerms';

const terms = (over: Partial<VenueHostTerms> = {}): VenueHostTerms => ({
  venue_id: 'v1',
  min_guests: 8,
  min_business: [{ model: 'FLAT', amount: 12000 }],
  min_spend: 5000,
  cleaning_fee: 500,
  pet_fee: 250,
  deposit: 2000,
  gst_enabled: true,
  ...over,
});

const answer = (rows: VenueHostTerms[]) => ({
  request: { query: VENUE_HOST_TERMS, variables: { venue_ids: ['v1'] } },
  result: { data: { venueHostTerms: rows } },
});

const renderCard = (mocks: unknown[]) =>
  render(
    <MockedProvider mocks={mocks as never}>
      <VenueHostTermsCard venueId="v1" />
    </MockedProvider>,
  );

describe('VenueHostTermsCard', () => {
  beforeEach(() => localStorage.setItem('token', 'signed-in'));
  afterEach(() => {
    localStorage.clear();
    navigate.mockReset();
  });

  it("shows a host the venue's minimums and fees, and picks it for a new pod", async () => {
    renderCard([answer([terms()])]);
    expect(await screen.findByTestId('venue-host-terms')).toBeInTheDocument();
    expect(screen.getByText('Fees & Minimum Spend')).toBeInTheDocument();
    expect(screen.getByTestId('venue-host-terms-minSpend')).toHaveTextContent('Minimum spend ₹5,000.00 per booking');
    expect(screen.getByTestId('venue-host-terms-minBusiness-FLAT')).toHaveTextContent('₹12,000.00 per booking');
    expect(screen.getByTestId('venue-host-terms-minGuests')).toHaveTextContent('Paid for at least 8 guests');
    expect(screen.getByTestId('venue-host-terms-cleaningFee')).toHaveTextContent('Cleaning fee ₹500.00');
    expect(screen.getByTestId('venue-host-terms-petFee')).toHaveTextContent('Pet fee ₹250.00, only when pets come');
    expect(screen.getByTestId('venue-host-terms-deposit')).toHaveTextContent('Refundable deposit ₹2,000.00, settled at the venue');
    expect(screen.getByTestId('venue-host-terms-gst')).toHaveTextContent('GST is added to the venue’s price');

    fireEvent.click(screen.getByRole('button', { name: 'Pick This Venue for Pod' }));
    expect(navigate).toHaveBeenCalledWith('/create-pod?pick_venue=v1');
  });

  it('says so when the venue sets no minimums or fees, and still offers the button', async () => {
    renderCard([answer([terms({ min_guests: 0, min_business: [], min_spend: 0, cleaning_fee: 0, pet_fee: 0, deposit: 0, gst_enabled: false })])]);
    expect(await screen.findByTestId('venue-host-terms-none')).toHaveTextContent('This venue sets no minimums or extra fees.');
    expect(screen.getByTestId('venue-pick-for-pod')).toBeInTheDocument();
  });

  it('shows nothing to a member the server gives no terms', async () => {
    const { container } = renderCard([answer([])]);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(screen.queryByTestId('venue-pick-for-pod')).not.toBeInTheDocument();
  });

  it('does not ask for a signed-out visitor', () => {
    localStorage.clear();
    const { container } = renderCard([]);
    expect(container).toBeEmptyDOMElement();
  });

  it('says the fees could not load, and retries', async () => {
    renderCard([
      { request: { query: VENUE_HOST_TERMS, variables: { venue_ids: ['v1'] } }, error: new Error('offline') },
      answer([terms()]),
    ]);
    expect(await screen.findByTestId('venue-host-terms-error')).toHaveTextContent(
      'Could not load this venue’s fees and minimum spend.',
    );
    fireEvent.click(screen.getByTestId('venue-host-terms-retry'));
    expect(await screen.findByTestId('venue-host-terms')).toBeInTheDocument();
  });
});
