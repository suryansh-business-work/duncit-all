import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ClubStoriesRail } from '@/components/details/club/ClubStoriesRail';
import { useClubStories } from '@/hooks/useClubStories';
import { useStatusUpload } from '@/hooks/useStatusUpload';
import { useStatusStore } from '@/stores/status.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useClubStories');
jest.mock('@/hooks/useStatusUpload');

const mockedStories = useClubStories as jest.Mock;
const mockedUpload = useStatusUpload as jest.Mock;

const pickAndUpload = jest.fn().mockResolvedValue(undefined);
const refetch = jest.fn().mockResolvedValue(undefined);

const story = (over: Record<string, unknown> = {}) => ({
  id: 'cs1',
  club_id: 'c1',
  image_url: 'https://x/story.jpg',
  media_type: 'IMAGE',
  caption: null,
  created_at: '2026-01-01T00:00:00.000Z',
  expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  seen_by_me: false,
  author: { user_id: 'u1', full_name: 'Asha Rao', profile_photo: null },
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedStories.mockReturnValue({ stories: [story()], isLoading: false, refetch });
  mockedUpload.mockReturnValue({
    uploading: false,
    progress: 0,
    pendingVideo: null,
    pickAndUpload,
    confirmVideo: jest.fn(),
    cancelVideo: jest.fn(),
  });
});

describe('ClubStoriesRail', () => {
  it('renders live club stories and the Add tile', () => {
    renderWithProviders(<ClubStoriesRail clubId="c1" clubName="Runners" />);
    expect(screen.getByText('Stories')).toBeOnTheScreen();
    expect(screen.getByTestId('club-story-add')).toBeOnTheScreen();
    expect(screen.getByTestId('club-story-cs1')).toBeOnTheScreen();
    // The tile is labelled with the author's first name.
    expect(screen.getByText('Asha')).toBeOnTheScreen();
  });

  it('scopes the upload to this club and posts on press', () => {
    renderWithProviders(<ClubStoriesRail clubId="c1" clubName="Runners" />);
    expect(mockedUpload).toHaveBeenCalledWith({ clubId: 'c1' });
    fireEvent.press(screen.getByTestId('club-story-add'));
    expect(pickAndUpload).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('club-story-add-badge'));
    expect(pickAndUpload).toHaveBeenCalledTimes(2);
  });

  it('hides a story that has passed its 24h window', () => {
    mockedStories.mockReturnValue({
      stories: [story({ expires_at: new Date(Date.now() - 1_000).toISOString() })],
      isLoading: false,
      refetch,
    });
    renderWithProviders(<ClubStoriesRail clubId="c1" clubName="Runners" />);
    expect(screen.queryByTestId('club-story-cs1')).toBeNull();
    // The Add tile still stands so the club can post its first story.
    expect(screen.getByTestId('club-story-add')).toBeOnTheScreen();
  });

  it('opens the viewer on a story, and every exit closes it', () => {
    renderWithProviders(<ClubStoriesRail clubId="c1" clubName="Runners" />);
    const open = () => fireEvent.press(screen.getByTestId('club-story-cs1'));

    open();
    expect(screen.getByTestId('status-viewer')).toBeOnTheScreen();
    // A club ring is a single group: advancing past its only slide closes it.
    fireEvent.press(screen.getByTestId('status-next'));
    expect(screen.queryByTestId('status-viewer')).toBeNull();

    open();
    fireEvent.press(screen.getByTestId('status-prev'));
    expect(screen.queryByTestId('status-viewer')).toBeNull();

    open();
    fireEvent.press(screen.getByTestId('status-viewer-close'));
    expect(screen.queryByTestId('status-viewer')).toBeNull();
  });

  it('routes a picked video through the trim preview sheet', () => {
    const confirmVideo = jest.fn().mockResolvedValue(undefined);
    const cancelVideo = jest.fn();
    mockedUpload.mockReturnValue({
      uploading: false,
      progress: 0,
      pendingVideo: { uri: 'file://c.mp4', durationSeconds: 12 },
      pickAndUpload,
      confirmVideo,
      cancelVideo,
    });
    renderWithProviders(<ClubStoriesRail clubId="c1" clubName="Runners" />);
    fireEvent.press(screen.getByTestId('story-video-post'));
    expect(confirmVideo).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('story-video-cancel'));
    expect(cancelVideo).toHaveBeenCalled();
  });

  it('opens the story that was tapped, not the first one', () => {
    mockedStories.mockReturnValue({
      stories: [story(), story({ id: 'cs2', caption: 'second story' })],
      isLoading: false,
      refetch,
    });
    renderWithProviders(<ClubStoriesRail clubId="c1" clubName="Runners" />);
    fireEvent.press(screen.getByTestId('club-story-cs2'));
    // The viewer opens ON the tapped slide — its caption is the second story's.
    expect(screen.getByText('second story')).toBeOnTheScreen();
  });

  it('surfaces an upload failure — a non-follower must see why it was refused', () => {
    mockedUpload.mockReturnValue({
      uploading: false,
      error: 'Follow this club to post a story to it',
      progress: 0,
      pendingVideo: null,
      pickAndUpload,
      confirmVideo: jest.fn(),
      cancelVideo: jest.fn(),
    });
    renderWithProviders(<ClubStoriesRail clubId="c1" clubName="Runners" />);
    expect(screen.getByTestId('club-story-error')).toHaveTextContent(
      'Follow this club to post a story to it',
    );
  });

  it('records the view so the ring greys, like the mWeb club page', async () => {
    useStatusStore.setState({ seenIds: new Set<string>() });
    renderWithProviders(<ClubStoriesRail clubId="c1" clubName="Runners" />);
    fireEvent.press(screen.getByTestId('club-story-cs1'));
    expect(screen.getByTestId('status-viewer')).toBeOnTheScreen();
    // Opening a slide marks it seen in the shared story store.
    await waitFor(() => expect(useStatusStore.getState().seenIds.has('cs1')).toBe(true));
  });

  it('shows the posting label and refetches once an upload finishes', async () => {
    mockedUpload.mockReturnValue({
      uploading: true,
      progress: 40,
      pendingVideo: null,
      pickAndUpload,
      confirmVideo: jest.fn(),
      cancelVideo: jest.fn(),
    });
    const { rerender } = renderWithProviders(<ClubStoriesRail clubId="c1" clubName="Runners" />);
    expect(screen.getByText('Posting…')).toBeOnTheScreen();
    // Pressing while an upload runs must not start a second one.
    fireEvent.press(screen.getByTestId('club-story-add'));
    fireEvent.press(screen.getByTestId('club-story-add-badge'));
    expect(pickAndUpload).not.toHaveBeenCalled();

    mockedUpload.mockReturnValue({
      uploading: false,
      progress: 0,
      pendingVideo: null,
      pickAndUpload,
      confirmVideo: jest.fn(),
      cancelVideo: jest.fn(),
    });
    rerender(<ClubStoriesRail clubId="c1" clubName="Runners" />);
    await waitFor(() => expect(refetch).toHaveBeenCalled());
  });

  it('tolerates a video story and nullish story fields', () => {
    mockedStories.mockReturnValue({
      stories: [
        // A video story: the tile shows no image, the slide is VIDEO.
        story({ media_type: 'VIDEO', author: null }),
        // Legacy row with nothing but the essentials.
        story({
          id: 'cs2',
          media_type: null,
          caption: undefined,
          seen_by_me: null,
          author: { user_id: 'u2', full_name: null, profile_photo: null },
        }),
      ],
      isLoading: false,
      refetch,
    });
    renderWithProviders(<ClubStoriesRail clubId="c1" clubName="Runners" />);
    // No author, and an author without a name, both fall back to Member.
    expect(screen.getAllByText('Member')).toHaveLength(2);
    fireEvent.press(screen.getByTestId('club-story-cs2'));
    expect(screen.getByTestId('status-viewer')).toBeOnTheScreen();
  });
});
