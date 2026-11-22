import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { VenueHostTerms } from '@duncit/utils';

vi.mock('../../../hooks/usePricing', () => ({ usePricing: () => ({ currency: '₹' }) }));

import VenueCardTerms from '../VenueCardTerms';
import VenueExploreCard from '../VenueExploreCard';

const terms = (over: Partial<VenueHostTerms> = {}): VenueHostTerms => ({
  venue_id: 'v-1',
  min_guests: 10,
  min_business: [{ model: 'PER_GUEST', amount: 450 }],
  min_spend: 5000,
  cleaning_fee: 500,
  pet_fee: 0,
  deposit: 2000,
  gst_enabled: true,
  ...over,
});

const venue = { id: 'v-1', venue_name: 'Grand Hall', venue_type: 'Banquet', capacity: 200, city: 'Mumbai', locality: 'Andheri' };

describe('VenueCardTerms', () => {
  it("shows a host the venue's minimums in one line, without its fees", () => {
    render(<VenueCardTerms venueId="v-1" terms={terms()} />);
    const line = screen.getByTestId('venue-card-terms-v-1');
    expect(line).toHaveTextContent(
      'Minimum spend ₹5,000.00 per booking · ₹450.00 per guest · Paid for at least 10 guests',
    );
    expect(line).not.toHaveTextContent('Cleaning fee');
    expect(line).not.toHaveTextContent('GST');
  });

  it('uses the singular for a single guest', () => {
    render(<VenueCardTerms venueId="v-1" terms={terms({ min_spend: 0, min_business: [], min_guests: 1 })} />);
    expect(screen.getByTestId('venue-card-terms-v-1')).toHaveTextContent('Paid for at least 1 guest');
  });

  it('shows nothing for a venue that sets no minimums, even with fees', () => {
    const { container } = render(
      <VenueCardTerms venueId="v-1" terms={terms({ min_guests: 0, min_business: [], min_spend: 0 })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('VenueExploreCard with host terms', () => {
  it('carries the minimums under the location for a host', () => {
    render(<VenueExploreCard venue={venue} onOpen={vi.fn()} terms={terms()} />);
    expect(screen.getByTestId('venue-card-terms-v-1')).toBeInTheDocument();
    expect(screen.getByText('Andheri · Mumbai')).toBeInTheDocument();
  });

  it('stays as it always was for anyone without terms', () => {
    render(<VenueExploreCard venue={venue} onOpen={vi.fn()} />);
    expect(screen.queryByTestId('venue-card-terms-v-1')).not.toBeInTheDocument();
  });
});
