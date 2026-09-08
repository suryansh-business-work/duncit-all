import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VenueCardMedia from '../VenueCardMedia';

const HALL = 'https://ik.imagekit.io/duncit/venues/sunset-hall-cover.jpg';
const STAGE = 'https://ik.imagekit.io/duncit/venues/sunset-hall-stage.jpg';

/**
 * The photo half of a venue card.
 *
 * Its twin is the native `hosts-venues/VenueCardMedia`, and the two have to
 * agree on the three decisions below — a venue with no photos, a venue with
 * one, and the swipe that must not be read as a tap.
 */
describe('VenueCardMedia', () => {
  it('renders every image, each opening the venue', () => {
    const onOpen = vi.fn();
    render(<VenueCardMedia images={[HALL, STAGE]} venueName="Sunset Hall" onOpen={onOpen} />);

    const shots = screen.getAllByAltText('Sunset Hall') as HTMLImageElement[];
    expect(shots.map((img) => img.src)).toEqual(expect.arrayContaining([HALL, STAGE]));
    // Lazy, because a discovery list mounts many of these at once. Read off the
    // attribute: jsdom does not implement the `loading` IDL property.
    expect(shots[0].getAttribute('loading')).toBe('lazy');

    fireEvent.click(screen.getAllByLabelText('Sunset Hall')[0]);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  /*
    The placeholder is what an empty list means — a venue with no photos, and a
    venue whose photos have not arrived, look the same on purpose. Rendering an
    empty slider instead would leave a black band where the picture goes.
  */
  it('shows the storefront placeholder for a venue with no photos', () => {
    render(<VenueCardMedia images={[]} venueName="Sunset Hall" onOpen={vi.fn()} />);

    expect(screen.queryByAltText('Sunset Hall')).not.toBeInTheDocument();
    expect(screen.getByTestId('StorefrontIcon')).toBeInTheDocument();
  });

  // One photo is not a carousel: no arrows to press, no dots to count.
  it('hides the arrows when there is only one photo', () => {
    render(<VenueCardMedia images={[HALL]} venueName="Sunset Hall" onOpen={vi.fn()} />);

    expect(screen.queryByLabelText(/previous/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/next/i)).not.toBeInTheDocument();
  });

  it('offers arrows once there is more than one photo', () => {
    render(<VenueCardMedia images={[HALL, STAGE]} venueName="Sunset Hall" onOpen={vi.fn()} />);

    expect(screen.getByLabelText(/previous/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/next/i)).toBeInTheDocument();
  });

  /*
    The bug this guards. react-slick fires a click on the slide a swipe ended
    on, so without the dragging flag every drag across a card navigated away to
    the venue the finger happened to lift over.
  */
  it('does not open the venue on the click that ends a swipe', () => {
    const onOpen = vi.fn();
    render(<VenueCardMedia images={[HALL, STAGE]} venueName="Sunset Hall" onOpen={onOpen} />);

    // Pressing an arrow runs beforeChange, which is what sets the flag.
    fireEvent.click(screen.getByLabelText(/next/i));
    fireEvent.click(screen.getAllByLabelText('Sunset Hall')[0]);
    expect(onOpen).not.toHaveBeenCalled();
  });

  // …and clears it again once the slide settles, or the card would open on a
  // swipe and then never open on a tap.
  it('opens the venue again once the slide has settled', async () => {
    const onOpen = vi.fn();
    render(<VenueCardMedia images={[HALL, STAGE]} venueName="Sunset Hall" onOpen={onOpen} />);

    fireEvent.click(screen.getByLabelText(/next/i));
    await waitFor(() => {
      fireEvent.click(screen.getAllByLabelText('Sunset Hall')[0]);
      expect(onOpen).toHaveBeenCalled();
    });
  });
});
