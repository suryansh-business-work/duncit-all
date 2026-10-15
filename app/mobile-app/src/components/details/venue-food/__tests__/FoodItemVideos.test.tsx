import { fireEvent, screen } from '@testing-library/react-native';

import { FoodItemVideos } from '@/components/details/venue-food/FoodItemVideos';
import { renderWithProviders } from '@/utils/test-utils';

const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const CLIP = 'https://ik.imagekit.io/duncit/venues/v1/tikka.mp4';

describe('FoodItemVideos', () => {
  it('shows no chip for a dish without playable videos', () => {
    const { rerender } = renderWithProviders(
      <FoodItemVideos item={{ id: 'tikka', name: 'Paneer Tikka' }} />,
    );
    expect(screen.queryByTestId('food-item-videos-tikka')).toBeNull();

    rerender(<FoodItemVideos item={{ id: 'tikka', name: 'Paneer Tikka', videos: [' '] }} />);
    expect(screen.queryByTestId('food-item-videos-tikka')).toBeNull();
  });

  it('loads no player until the guest opens the sheet, then plays each video and closes', () => {
    renderWithProviders(
      <FoodItemVideos item={{ id: 'tikka', name: 'Paneer Tikka', videos: [YOUTUBE, CLIP] }} />,
    );

    const chip = screen.getByTestId('food-item-videos-tikka');
    expect(chip).toHaveTextContent('Watch video');
    expect(screen.getByLabelText('Watch video')).toBeOnTheScreen();
    expect(screen.queryByTestId('food-item-video-tikka-0')).toBeNull();

    fireEvent.press(chip);
    expect(screen.getByTestId('food-item-videos-sheet-tikka-title')).toHaveTextContent(
      'Paneer Tikka',
    );
    expect(screen.getByTestId('food-item-video-tikka-0')).toBeOnTheScreen();
    expect(screen.getByTestId('food-item-video-tikka-0-open')).toBeOnTheScreen();
    expect(screen.getByTestId('food-item-video-tikka-1')).toBeOnTheScreen();
    expect(screen.getByLabelText('Video 1 of Paneer Tikka')).toBeOnTheScreen();
    expect(screen.getByLabelText('Video 2 of Paneer Tikka')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('food-item-videos-sheet-tikka-close'));
    expect(screen.queryByTestId('food-item-video-tikka-0')).toBeNull();
  });
});
