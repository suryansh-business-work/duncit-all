import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { useVideoPlayer } from 'expo-video';
import { venueVideoOf, type VenueVideo } from '@duncit/forms/schemas';
import { videoSourceUrl } from '@duncit/utils';

import { VenueVideoPlayer } from '@/components/details/VenueVideoPlayer';
import { VenueVideosSection } from '@/components/details/VenueVideosSection';
import { renderWithProviders } from '@/utils/test-utils';

// The setup mock renders the WebView as a bare View; give it an id here so the
// spec can read which address the embedded player loads.
jest.mock('react-native-webview', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    __esModule: true,
    WebView: (props: Record<string, unknown>) => <View testID="youtube-webview" {...props} />,
  };
});

const YOUTUBE = 'https://youtu.be/dQw4w9WgXcQ';
const CLIP = 'https://ik.imagekit.io/duncit/venues/v1/clip.mp4';

const videoOf = (url: string): VenueVideo => {
  const video = venueVideoOf(url);
  if (!video) throw new Error(`not a video: ${url}`);
  return video;
};

let openURL: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

afterEach(() => {
  openURL.mockRestore();
});

describe('VenueVideoPlayer', () => {
  it('plays a YouTube link through the privacy-enhanced embed and opens it in YouTube', () => {
    renderWithProviders(
      <VenueVideoPlayer video={videoOf(YOUTUBE)} title="Video 1 of Sunset Cafe" testID="clip" />,
    );

    expect(screen.getByTestId('clip')).toBeOnTheScreen();
    expect(screen.getByLabelText('Video 1 of Sunset Cafe')).toBeOnTheScreen();
    const frame = screen.getByTestId('youtube-webview');
    expect(frame.props.source).toEqual({
      uri: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    });
    // Nothing plays until the guest asks.
    expect(frame.props.mediaPlaybackRequiresUserAction).toBe(true);
    expect(useVideoPlayer).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('clip-open'));
    expect(screen.getByTestId('clip-open')).toHaveTextContent('Watch on YouTube');
    expect(openURL).toHaveBeenCalledWith('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('plays an uploaded clip from its stored file with the platform controls', () => {
    renderWithProviders(
      <VenueVideoPlayer video={videoOf(CLIP)} title="Video 2 of Sunset Cafe" testID="clip" />,
    );

    expect(useVideoPlayer).toHaveBeenCalledWith(videoSourceUrl(CLIP));
    const view = screen.getByTestId('clip');
    expect(view.props.nativeControls).toBe(true);
    expect(view.props.contentFit).toBe('contain');
    expect(screen.getByLabelText('Video 2 of Sunset Cafe')).toBeOnTheScreen();
    expect(screen.queryByTestId('youtube-webview')).toBeNull();
    expect(screen.queryByTestId('clip-open')).toBeNull();
  });
});

describe('VenueVideosSection', () => {
  it('renders nothing for a venue without videos, or with only blank entries', () => {
    const { rerender } = renderWithProviders(
      <VenueVideosSection videos={null} venueName="Sunset Cafe" />,
    );
    expect(screen.queryByTestId('venue-videos')).toBeNull();

    rerender(<VenueVideosSection venueName="Sunset Cafe" />);
    expect(screen.queryByTestId('venue-videos')).toBeNull();

    rerender(<VenueVideosSection videos={['', '   ']} venueName="Sunset Cafe" />);
    expect(screen.queryByTestId('venue-videos')).toBeNull();
  });

  it('lists every playable video in the owner order, each titled for a screen reader', () => {
    renderWithProviders(
      <VenueVideosSection videos={[YOUTUBE, '', CLIP]} venueName="Sunset Cafe" />,
    );

    expect(screen.getByTestId('venue-videos')).toBeOnTheScreen();
    expect(screen.getByText('Videos')).toBeOnTheScreen();
    // The blank entry is dropped, so the clip is the second video.
    expect(screen.getByTestId('venue-video-0-open')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-video-1')).toBeOnTheScreen();
    expect(screen.queryByTestId('venue-video-2')).toBeNull();
    expect(screen.getByLabelText('Video 1 of Sunset Cafe')).toBeOnTheScreen();
    expect(screen.getByLabelText('Video 2 of Sunset Cafe')).toBeOnTheScreen();
  });
});
