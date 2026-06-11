import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VenueCard from './VenueCard';

const make = (over: Record<string, unknown>) => ({
  venue_name: 'The Loft', venue_type: 'CAFE', locality: 'Kothrud', city: 'Pune', state: 'MH',
  capacity: 40, step_completed: 3, postal_code: '411038', owner_name: 'Asha',
  owner_email: 'a@b.com', owner_phone: '999', status: 'APPROVED', ...over,
});

describe('VenueCard', () => {
  it('renders status colours, docs count, tags and notes', () => {
    render(<VenueCard venue={make({ status: 'APPROVED', tags: ['rooftop'], documents: [{}], reviewer_notes: 'good' })} onReview={vi.fn()} />);
    render(<VenueCard venue={make({ status: 'REJECTED' })} onReview={vi.fn()} />);
    render(<VenueCard venue={make({ status: 'SUBMITTED' })} onReview={vi.fn()} />);
    render(<VenueCard venue={make({ status: 'DRAFT', venue_name: '', postal_code: '' })} onReview={vi.fn()} />);
    expect(screen.getByText('rooftop')).toBeInTheDocument();
    expect(screen.getByText('good')).toBeInTheDocument();
    expect(screen.getByText('(Unnamed venue)')).toBeInTheDocument();
    // Empty location parts fall back to a dash.
    render(<VenueCard venue={make({ locality: '', city: '', state: '' })} onReview={vi.fn()} />);
  });

  it('fires onReview', () => {
    const onReview = vi.fn();
    const venue = make({});
    render(<VenueCard venue={venue} onReview={onReview} />);
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(onReview).toHaveBeenCalledWith(venue);
  });
});
