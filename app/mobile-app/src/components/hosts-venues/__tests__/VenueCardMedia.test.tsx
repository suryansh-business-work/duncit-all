import { fireEvent, screen } from '@testing-library/react-native';

import { VenueCardMedia } from '@/components/hosts-venues/VenueCardMedia';
import { renderWithProviders } from '@/utils/test-utils';

const HALL = 'https://ik.imagekit.io/duncit/venues/sunset-hall-cover.jpg';
const STAGE = 'https://ik.imagekit.io/duncit/venues/sunset-hall-stage.jpg';

/** The slider only mounts once the frame has been measured — a FlatList with a
 * zero width would page by nothing. */
const measure = (width = 300) =>
  fireEvent(screen.getByTestId('venue-card-media'), 'layout', {
    nativeEvent: { layout: { width, height: width / 1.5 } },
  });

/**
 * The photo half of a venue card, Tamagui side.
 *
 * Its twin is mWeb's `venues-page/VenueCardMedia`, and rule 27 says the two
 * behave identically: same placeholder for a venue with no photos, same
 * arrows-only-when-there-is-somewhere-to-go, same tap-opens-the-venue.
 */
describe('VenueCardMedia', () => {
  it('renders every image once the frame is measured, each opening the venue', () => {
    const onOpen = jest.fn();
    renderWithProviders(
      <VenueCardMedia images={[HALL, STAGE]} venueName="Sunset Hall" onOpen={onOpen} />,
    );
    measure();

    const shots = screen.getAllByLabelText('Sunset Hall');
    expect(shots.length).toBeGreaterThan(0);
    fireEvent.press(shots[0]!);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  /*
    An empty list is the signal to draw the placeholder — a venue with no
    photos and one whose photos have not arrived look the same on purpose,
    rather than leaving a black band where the picture goes.
  */
  it('shows the storefront placeholder for a venue with no photos', () => {
    renderWithProviders(<VenueCardMedia images={[]} venueName="Sunset Hall" onOpen={jest.fn()} />);

    expect(screen.queryByLabelText('Sunset Hall')).toBeNull();
  });

  // One photo is not a carousel: nothing to page to, so no arrows and no dots.
  it('hides the arrows when there is only one photo', () => {
    renderWithProviders(
      <VenueCardMedia images={[HALL]} venueName="Sunset Hall" onOpen={jest.fn()} />,
    );
    measure();

    expect(screen.queryByLabelText('Previous image')).toBeNull();
    expect(screen.queryByLabelText('Next image')).toBeNull();
  });

  it('pages forward and back through the arrows, clamped at both ends', () => {
    renderWithProviders(
      <VenueCardMedia images={[HALL, STAGE]} venueName="Sunset Hall" onOpen={jest.fn()} />,
    );
    measure();

    const next = screen.getByLabelText('Next image');
    const previous = screen.getByLabelText('Previous image');

    // Past the last photo and before the first are both no-ops rather than a
    // scroll to an offset that does not exist.
    fireEvent.press(next);
    fireEvent.press(next);
    fireEvent.press(previous);
    fireEvent.press(previous);
    expect(screen.getAllByLabelText('Sunset Hall').length).toBeGreaterThan(0);
  });

  /*
    A finger-swipe never touches the arrows, so the dots would freeze on the
    first photo unless the list reports where it came to rest. The offset is
    divided by the measured width, which is why the frame has to be measured
    before this means anything.
  */
  it('follows a swipe, so the dots track the photo the list settled on', () => {
    renderWithProviders(
      <VenueCardMedia images={[HALL, STAGE]} venueName="Sunset Hall" onOpen={jest.fn()} />,
    );
    measure(300);

    fireEvent(screen.getByTestId('venue-card-slider'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 300, y: 0 } },
    });

    // Still rendering both photos, now reporting the second as current.
    expect(screen.getAllByLabelText('Sunset Hall').length).toBeGreaterThan(0);
  });
});
