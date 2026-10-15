import { Linking } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { FoodDishVideos } from '@/components/venue-food-desk/menu/FoodDishVideos';
import { renderWithProviders } from '@/utils/test-utils';

const YOUTUBE = 'https://youtu.be/dQw4w9WgXcQ';
const CLIP = 'https://ik.imagekit.io/duncit/venues/v1/tikka.mp4';
const OTHER_YOUTUBE = 'https://www.youtube.com/shorts/abcdefghijk';

const onChange = jest.fn();
let openURL: jest.SpyInstance;

const field = (videos: string[], over: { limit?: number; error?: string } = {}) => (
  <FoodDishVideos
    videos={videos}
    onChange={onChange}
    limit={over.limit ?? 3}
    testID="dish-videos"
    error={over.error}
  />
);

beforeEach(() => {
  jest.clearAllMocks();
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

afterEach(() => {
  openURL.mockRestore();
});

describe('FoodDishVideos', () => {
  it('lists each video by kind, opens it, and removes the one asked for', () => {
    renderWithProviders(field([YOUTUBE, CLIP]));

    expect(screen.getByTestId('dish-videos-label-label')).toHaveTextContent('Videos (2 of 3)');
    expect(screen.getByText('YouTube video 1')).toBeOnTheScreen();
    expect(screen.getByText('Uploaded video 2')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('Uploaded video 2'));
    expect(openURL).toHaveBeenCalledWith(CLIP);

    expect(screen.getByTestId('dish-videos-remove-0')).toHaveProp('aria-label', 'Remove video 1');
    fireEvent.press(screen.getByTestId('dish-videos-remove-0'));
    expect(onChange).toHaveBeenCalledWith([CLIP]);
  });

  it('adds a pasted YouTube link and clears the box for the next one', async () => {
    renderWithProviders(field([CLIP]));

    fireEvent.changeText(screen.getByTestId('field-url'), `  ${OTHER_YOUTUBE}  `);
    fireEvent.press(screen.getByTestId('dish-videos-youtube-add'));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith([CLIP, OTHER_YOUTUBE]));
    await waitFor(() => expect(screen.getByTestId('field-url')).toHaveProp('value', ''));
  });

  it('does not list the same link twice', async () => {
    renderWithProviders(field([YOUTUBE]));

    fireEvent.changeText(screen.getByTestId('field-url'), YOUTUBE);
    fireEvent.press(screen.getByTestId('dish-videos-youtube-add'));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith([YOUTUBE]));
  });

  it('refuses a link that is not a YouTube video', async () => {
    renderWithProviders(field([]));

    fireEvent.changeText(screen.getByTestId('field-url'), 'https://vimeo.com/12345');
    fireEvent.press(screen.getByTestId('dish-videos-youtube-add'));

    expect(await screen.findByTestId('url-error')).toHaveTextContent(
      'Enter a YouTube video link (watch, shorts or youtu.be)',
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('hides the add box once the dish has as many videos as allowed', () => {
    renderWithProviders(field([YOUTUBE, CLIP], { limit: 2 }));

    expect(screen.getByTestId('dish-videos-label-label')).toHaveTextContent('Videos (2 of 2)');
    expect(screen.queryByTestId('field-url')).toBeNull();
    expect(screen.queryByTestId('dish-videos-youtube-add')).toBeNull();
  });

  it('shows the form error for the list', () => {
    renderWithProviders(field([YOUTUBE], { error: 'At most 3 videos' }));

    expect(screen.getByText('At most 3 videos')).toBeOnTheScreen();
  });
});
