import { act, fireEvent, screen } from '@testing-library/react-native';

import { StatusRail } from '@/components/status/StatusRail';
import { renderWithProviders } from '@/utils/test-utils';

const mockUseStoryRail = jest.fn();
const mockUseStatusUpload = jest.fn();
jest.mock('@/hooks/useStoryRail', () => ({ useStoryRail: () => mockUseStoryRail() }));
jest.mock('@/hooks/useStatusUpload', () => ({ useStatusUpload: () => mockUseStatusUpload() }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const mockRecordView = jest.fn();
const mockDeleteStory = jest.fn().mockResolvedValue(undefined);
// A reassignable Set so a test can flip a story's seen state (a new reference)
// and re-render to exercise the "freeze while open" behaviour.
let mockSeenIds = new Set<string>();
jest.mock('@/stores/status.store', () => ({
  useStatusStore: (selector: (s: unknown) => unknown) =>
    selector({
      recordView: mockRecordView,
      deleteStory: mockDeleteStory,
      seenIds: mockSeenIds,
    }),
}));
const mockGraphql = jest.fn().mockResolvedValue({ storyViewers: [] });
jest.mock('@/services/graphql.client', () => ({
  graphqlRequest: (...args: unknown[]) => mockGraphql(...args),
}));

const slide = {
  id: 's1',
  imageUrl: 'https://i/s.jpg',
  mediaType: 'IMAGE',
  caption: 'Hi',
  createdAt: '2026-06-09T10:00:00.000Z',
  expiresAt: null,
};
const mineGroup = {
  authorId: 'me',
  name: 'You',
  photo: null,
  slides: [slide],
  cover: slide,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSeenIds = new Set<string>();
  // Deterministic rail order (Fisher–Yates with random=0 is stable per input).
  jest.spyOn(Math, 'random').mockReturnValue(0);
  mockDeleteStory.mockResolvedValue(undefined);
  mockGraphql.mockResolvedValue({ storyViewers: [] });
  mockUseStoryRail.mockReturnValue({
    mine: null,
    items: [
      {
        authorId: 'a1',
        key: 'user-a1',
        name: 'Asha',
        photo: null,
        slides: [slide],
        cover: slide,
        target: { kind: 'user', id: 'a1' },
      },
    ],
    isLoading: false,
  });
  mockUseStatusUpload.mockReturnValue({ uploading: false, pickAndUpload: jest.fn() });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('StatusRail', () => {
  it('opens and closes the status viewer', () => {
    renderWithProviders(<StatusRail userName="You" />);
    fireEvent.press(screen.getByTestId('status-user-a1'));
    expect(screen.getByTestId('status-viewer')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('status-viewer-close'));
    expect(screen.queryByTestId('status-viewer')).toBeNull();
  });

  it('shows the posting label and skips re-upload while uploading', () => {
    const pickAndUpload = jest.fn();
    mockUseStatusUpload.mockReturnValue({ uploading: true, pickAndUpload });
    renderWithProviders(<StatusRail userName="You" />);
    expect(screen.getByText('Posting…')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('status-mine'));
    expect(pickAndUpload).not.toHaveBeenCalled();
  });

  it('shows the upload progress overlay on the own tile (Bug 1)', () => {
    mockUseStatusUpload.mockReturnValue({
      uploading: true,
      progress: 45,
      pickAndUpload: jest.fn(),
    });
    renderWithProviders(<StatusRail userName="You" />);
    expect(screen.getByTestId('status-mine-progress')).toBeOnTheScreen();
  });

  it('sends a fully-seen followed story to the end of the rail (Bug 2)', () => {
    const seenSlide = { ...slide, id: 's2', seenByMe: true };
    mockUseStoryRail.mockReturnValue({
      mine: null,
      items: [
        {
          authorId: 'a1',
          key: 'user-a1',
          name: 'Asha',
          photo: null,
          slides: [slide],
          cover: slide,
          target: { kind: 'user', id: 'a1' },
        },
        {
          authorId: 'a2',
          key: 'user-a2',
          name: 'Bina',
          photo: null,
          slides: [seenSlide],
          cover: seenSlide,
          target: { kind: 'user', id: 'a2' },
        },
      ],
      isLoading: false,
    });
    renderWithProviders(<StatusRail userName="You" />);
    // The seen tile (a2) is pushed behind the unseen one (a1): opening it lands
    // on the last group, so advancing past its only slide closes the viewer.
    fireEvent.press(screen.getByTestId('status-user-a2'));
    expect(screen.getByTestId('status-viewer')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('status-next'));
    expect(screen.queryByTestId('status-viewer')).toBeNull();
  });

  it('freezes the rail order while a story is open, re-ordering only on close (Bug 2)', () => {
    const a1Slide = { ...slide, id: 'a1s', caption: 'A1CAP' };
    const a2Slide = { ...slide, id: 'a2s', caption: 'A2CAP' };
    mockUseStoryRail.mockReturnValue({
      mine: null,
      items: [
        {
          authorId: 'a1',
          key: 'user-a1',
          name: 'Asha',
          photo: null,
          slides: [a1Slide],
          cover: a1Slide,
          target: { kind: 'user', id: 'a1' },
        },
        {
          authorId: 'a2',
          key: 'user-a2',
          name: 'Bina',
          photo: null,
          slides: [a2Slide],
          cover: a2Slide,
          target: { kind: 'user', id: 'a2' },
        },
      ],
      isLoading: false,
    });
    const { rerender } = renderWithProviders(<StatusRail userName="You" />);
    // Shuffle(random=0) → frozen order [a2, a1]; open a2 (the first tile).
    fireEvent.press(screen.getByTestId('status-user-a2'));
    expect(screen.getByText('A2CAP')).toBeOnTheScreen();
    // a2 becomes fully seen mid-view. Live, that would drop it behind a1 and
    // re-index the open viewer — frozen, the viewer stays on a2 (no jump).
    mockSeenIds = new Set(['a2s']);
    rerender(<StatusRail userName="You" />);
    expect(screen.getByText('A2CAP')).toBeOnTheScreen();
    // On close the rail re-orders against the new seen state.
    fireEvent.press(screen.getByTestId('status-viewer-close'));
    expect(screen.queryByTestId('status-viewer')).toBeNull();
  });

  it('records a view and likes a followed story, tolerating a like failure (Bugs 2 & 5)', async () => {
    mockGraphql.mockRejectedValueOnce(new Error('like failed'));
    renderWithProviders(<StatusRail userName="You" />);
    fireEvent.press(screen.getByTestId('status-user-a1'));
    // Opening records the shown slide as seen.
    expect(mockRecordView).toHaveBeenCalledWith('s1');
    await act(async () => {
      fireEvent.press(screen.getByTestId('status-like'));
    });
    expect(mockGraphql).toHaveBeenCalled();
  });

  it('opens and closes the viewers sheet for an own story (Bug 4)', async () => {
    mockUseStoryRail.mockReturnValue({ mine: mineGroup, items: [], isLoading: false });
    renderWithProviders(<StatusRail userName="You" />);
    fireEvent.press(screen.getByTestId('status-mine'));
    fireEvent.press(screen.getByTestId('status-viewers'));
    expect(screen.getByTestId('story-viewers-sheet')).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId('story-viewers-close'));
    });
    expect(screen.queryByTestId('story-viewers-sheet')).toBeNull();
  });

  it('deletes an own story after confirming, and closes the viewer (Bug 7)', async () => {
    mockUseStoryRail.mockReturnValue({ mine: mineGroup, items: [], isLoading: false });
    renderWithProviders(<StatusRail userName="You" />);
    fireEvent.press(screen.getByTestId('status-mine'));
    fireEvent.press(screen.getByTestId('status-viewer-kebab'));
    fireEvent.press(screen.getByTestId('status-viewer-delete'));
    expect(screen.getByTestId('status-delete-confirm')).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId('status-delete-confirm-confirm'));
    });
    expect(mockDeleteStory).toHaveBeenCalledWith('s1');
    expect(screen.queryByTestId('status-viewer')).toBeNull();
  });

  it('cancels an own-story delete (Bug 7)', () => {
    mockUseStoryRail.mockReturnValue({ mine: mineGroup, items: [], isLoading: false });
    renderWithProviders(<StatusRail userName="You" />);
    fireEvent.press(screen.getByTestId('status-mine'));
    fireEvent.press(screen.getByTestId('status-viewer-kebab'));
    fireEvent.press(screen.getByTestId('status-viewer-delete'));
    fireEvent.press(screen.getByTestId('status-delete-confirm-cancel'));
    expect(mockDeleteStory).not.toHaveBeenCalled();
  });
});
