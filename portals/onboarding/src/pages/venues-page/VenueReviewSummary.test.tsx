import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import VenueReviewSummary from './VenueReviewSummary';

const fullVenue = {
  id: 'v1',
  venue_name: 'The Loft',
  venue_type: 'CAFE',
  capacity: 40,
  gstin: '27AAAPL1234C1ZV',
  pan: 'AAAPL1234C',
  venue_category: {
    super_category_name: 'Sports',
    category_name: 'Cricket',
    sub_category_name: 'Box Cricket',
  },
  capacity_items: [
    { label: 'Tables', capacity: 10 },
    { label: 'Turf', capacity: 2 },
  ],
  locality: 'Kothrud',
  city: 'Pune',
  state: 'Maharashtra',
  country: 'India',
  postal_code: '411038',
  documents: [
    { type: 'GST_CERTIFICATE', url: 'https://cdn.duncit.com/venues/v1/gst.pdf' },
    { type: 'SHOP_LICENSE', url: 'https://cdn.duncit.com/venues/v1/shop.pdf' },
  ],
};

describe('VenueReviewSummary', () => {
  it('shows the type, capacity, tax ids, category, where it is and its documents', () => {
    render(<VenueReviewSummary active={fullVenue} />);
    expect(screen.getByText('CAFE')).toBeInTheDocument();
    expect(screen.getByText('Capacity 40')).toBeInTheDocument();
    expect(screen.getByText('GSTIN 27AAAPL1234C1ZV')).toBeInTheDocument();
    expect(screen.getByText('PAN AAAPL1234C')).toBeInTheDocument();
    expect(screen.getByText('Sports › Cricket › Box Cricket')).toBeInTheDocument();
    expect(screen.getByText('Tables: 10')).toBeInTheDocument();
    expect(screen.getByText('Kothrud, Pune, Maharashtra, India · PIN 411038')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('GST_CERTIFICATE').closest('a')).toHaveAttribute(
      'href',
      'https://cdn.duncit.com/venues/v1/gst.pdf',
    );
  });

  // A half-filled application: nothing optional is invented.
  it('dashes what a half-filled application has not given yet', () => {
    render(<VenueReviewSummary active={{ id: 'v2', venue_name: 'New place', city: 'Pune' }} />);
    expect(screen.getByText('GSTIN —')).toBeInTheDocument();
    expect(screen.getByText('PAN —')).toBeInTheDocument();
    expect(screen.getByText('Pune')).toBeInTheDocument();
    expect(screen.queryByText(/Capacity/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hosts in/)).not.toBeInTheDocument();
    expect(screen.queryByText('Documents')).not.toBeInTheDocument();
  });

  // The review dialog keeps its content mounted while it closes, with no venue.
  it('renders an empty summary while the dialog closes on it', () => {
    render(<VenueReviewSummary active={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('GSTIN —')).toBeInTheDocument();
  });
});
