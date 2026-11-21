import { screen } from '@testing-library/react-native';
import type { VenueHostTerms } from '@duncit/utils';

import { VenueCard } from '@/components/hosts-venues/VenueCard';
import { VenueCardTerms } from '@/components/hosts-venues/VenueCardTerms';
import { renderWithProviders } from '@/utils/test-utils';

const terms = (over: Partial<VenueHostTerms> = {}): VenueHostTerms => ({
  venue_id: 'v1',
  min_guests: 10,
  min_business: [{ model: 'PER_GUEST', amount: 450 }],
  min_spend: 5000,
  cleaning_fee: 500,
  pet_fee: 0,
  deposit: 0,
  gst_enabled: true,
  ...over,
});

const venue = { id: 'v1', venue_name: 'Sunset Hall', venue_type: 'Cafe', capacity: 40, city: 'Pune', locality: 'Baner' };

describe('VenueCardTerms', () => {
  it("shows a host the venue's minimums in one line, without its fees", () => {
    renderWithProviders(<VenueCardTerms venueId="v1" terms={terms()} />);
    const line = screen.getByTestId('venue-card-terms-v1');
    expect(line).toHaveTextContent('Minimum spend ₹5,000 per booking · ₹450 per guest · Paid for at least 10 guests');
    expect(line).not.toHaveTextContent(/Cleaning fee/);
  });

  it('shows nothing without terms, or for a venue that sets no minimums', () => {
    renderWithProviders(<VenueCardTerms venueId="v1" />);
    expect(screen.queryByTestId('venue-card-terms-v1')).toBeNull();
    renderWithProviders(<VenueCardTerms venueId="v1" terms={terms({ min_guests: 0, min_business: [], min_spend: 0 })} />);
    expect(screen.queryByTestId('venue-card-terms-v1')).toBeNull();
  });

  it('rides on the venue card for a host, and leaves the card as it was for anyone else', () => {
    const { unmount } = renderWithProviders(<VenueCard venue={venue as never} onOpen={jest.fn()} terms={terms()} />);
    expect(screen.getByTestId('venue-card-terms-v1')).toBeTruthy();
    unmount();
    renderWithProviders(<VenueCard venue={venue as never} onOpen={jest.fn()} />);
    expect(screen.getByText('Sunset Hall')).toBeTruthy();
    expect(screen.queryByTestId('venue-card-terms-v1')).toBeNull();
  });
});
