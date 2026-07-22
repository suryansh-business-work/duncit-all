import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VenueExploreCard, { type ExploreVenue } from '../VenueExploreCard';

const baseVenue = (over: Partial<ExploreVenue> = {}): ExploreVenue => ({
  id: 'v-1',
  venue_name: 'Grand Hall',
  venue_type: 'Banquet',
  capacity: 200,
  cover_image_url: null,
  city: 'Mumbai',
  locality: 'Andheri',
  pod_count: 5,
  ...over,
});

describe('VenueExploreCard', () => {
  it('renders name, meta (type/capacity/pods) and location', () => {
    render(<VenueExploreCard venue={baseVenue()} onOpen={vi.fn()} />);
    expect(screen.getByText('Grand Hall')).toBeInTheDocument();
    expect(screen.getByText('Banquet · 200 capacity · 5 pods')).toBeInTheDocument();
    expect(screen.getByText('Andheri · Mumbai')).toBeInTheDocument();
  });

  it('fires onOpen when the card action area is clicked', () => {
    const onOpen = vi.fn();
    render(<VenueExploreCard venue={baseVenue()} onOpen={onOpen} />);
    fireEvent.click(screen.getByTestId('venue-card-v-1'));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('renders the cover image when a url is provided', () => {
    render(
      <VenueExploreCard
        venue={baseVenue({ cover_image_url: 'https://img.test/x.jpg' })}
        onOpen={vi.fn()}
      />,
    );
    const img = screen.getByAltText('Grand Hall') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://img.test/x.jpg');
  });

  it('shows the storefront fallback icon and no meta/location when data is absent', () => {
    const { container } = render(
      <VenueExploreCard
        venue={baseVenue({
          venue_type: null,
          capacity: null,
          pod_count: null,
          city: null,
          locality: null,
          cover_image_url: null,
        })}
        onOpen={vi.fn()}
      />,
    );
    // Only the name renders; meta and location are omitted.
    expect(screen.getByText('Grand Hall')).toBeInTheDocument();
    expect(screen.queryByText(/capacity/)).not.toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
    // Fallback icon renders (svg present, no img).
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('joins location with only the available part', () => {
    render(
      <VenueExploreCard
        venue={baseVenue({ locality: null, venue_type: null, capacity: null, pod_count: null })}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText('Mumbai')).toBeInTheDocument();
  });
});
