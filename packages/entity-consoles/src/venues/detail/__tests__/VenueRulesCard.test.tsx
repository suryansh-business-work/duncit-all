import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import VenueRulesCard from '../VenueRulesCard';
import { venueSettings } from './fixtures';

/** A split row: label paragraph, value beside it. */
const row = (label: string) => screen.getByText(label).parentElement as HTMLElement;

describe('VenueRulesCard', () => {
  it('reads every numeric rule and each flag as Yes or No', () => {
    render(<VenueRulesCard settings={venueSettings()} />);

    expect(screen.getByRole('heading', { name: 'Venue rules' })).toBeInTheDocument();
    expect(row('Buffer between slots (min)')).toHaveTextContent('15');
    expect(row('Minimum booking notice (min)')).toHaveTextContent('120');
    expect(row('Maximum advance booking (days)')).toHaveTextContent('30');
    expect(row('Maximum bookings per slot')).toHaveTextContent('2');
    expect(row('Allow instant booking')).toHaveTextContent('Yes');
    expect(row('Allow waitlist')).toHaveTextContent('No');
    expect(row('Booking approval required')).toHaveTextContent('Yes');
    expect(row('Allow multiple bookings')).toHaveTextContent('No');
  });
});
