import { screen } from '@testing-library/react-native';

import { VenueCardMedia } from '@/components/hosts-venues/VenueCardMedia';
import { renderWithProviders } from '@/utils/test-utils';

const HALL = 'https://ik.imagekit.io/duncit/venues/sunset-hall-cover.jpg';

/*
  With only an aspect ratio, Yoga met the 300px height cap by shrinking the
  width too, so on a tablet the photo stopped at 450px and left the rest of the
  card empty. The frame now pins its width to the card so the cap trims the
  height alone — for the photo slider and the no-photo placeholder alike.
*/
describe('VenueCardMedia — full-bleed frame', () => {
  it('pins the photo frame to the full card width under the height cap', () => {
    renderWithProviders(
      <VenueCardMedia images={[HALL]} venueName="Sunset Hall" onOpen={jest.fn()} />,
    );
    expect(screen.getByTestId('venue-card-media')).toHaveStyle({
      width: '100%',
      aspectRatio: 1.5,
      maxHeight: 300,
    });
  });

  it('pins the no-photo placeholder to the full card width as well', () => {
    renderWithProviders(<VenueCardMedia images={[]} venueName="Sunset Hall" onOpen={jest.fn()} />);
    expect(screen.queryByTestId('venue-card-media')).toBeNull();
    expect(
      screen.UNSAFE_root.findAll(
        (node) =>
          typeof node.type === 'string' &&
          node.props.style?.aspectRatio === 1.5 &&
          node.props.style?.maxHeight === 300 &&
          node.props.style?.width === '100%',
      ),
    ).toHaveLength(1);
  });
});
