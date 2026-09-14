import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import VenueSummaryCard from '../VenueSummaryCard';
import { makeVenue } from './fixtures';

describe('VenueSummaryCard', () => {
  it('shows the cover, the status and identity chips, the place, the category and a Maps link', () => {
    render(<VenueSummaryCard venue={makeVenue()} />);

    expect(screen.getByRole('img', { name: 'The Board Room Cafe' })).toHaveAttribute(
      'src',
      'https://ik.imagekit.io/duncit/venue-1.jpg',
    );
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Cafe')).toBeInTheDocument();
    expect(screen.getByText('DUN-VEN-2210')).toBeInTheDocument();
    expect(screen.getByText('Indiranagar, Bengaluru, Karnataka, India')).toBeInTheDocument();
    expect(screen.getByText('For You > Games > Board Games')).toBeInTheDocument();

    const maps = screen.getByRole('link', { name: 'Open in Maps' });
    expect(maps).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=12.9716,77.6412');
    expect(maps).toHaveAttribute('target', '_blank');
  });

  it('shows the four headline numbers', () => {
    render(<VenueSummaryCard venue={makeVenue()} />);

    expect(screen.getByText('Pods').parentElement).toHaveTextContent('18');
    expect(screen.getByText('Capacity').parentElement).toHaveTextContent('40');
    expect(screen.getByText('Venue share').parentElement).toHaveTextContent('70%');
    expect(screen.getByText('Commission').parentElement).toHaveTextContent('12%');
  });

  it('falls back to the logo, reads inactive, and drops the optional chips and the Maps link', () => {
    render(
      <VenueSummaryCard
        venue={makeVenue({
          cover_image_url: '',
          is_active: false,
          venue_type: '',
          venue_no: null,
          locality: '',
          city: '',
          state: '',
          country: '',
          lat: null,
        })}
      />,
    );

    expect(screen.getByRole('img', { name: 'The Board Room Cafe' })).toHaveAttribute('src', '/duncit-logo.svg');
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.queryByText('Cafe')).not.toBeInTheDocument();
    expect(screen.queryByText('DUN-VEN-2210')).not.toBeInTheDocument();
    expect(screen.getByText('Location not set')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open in Maps' })).not.toBeInTheDocument();
  });
});
