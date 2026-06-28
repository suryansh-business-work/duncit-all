import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { useProfilePhoto } from '@/hooks/useProfilePhoto';
import { useStatus } from '@/hooks/useStatus';
import { useStatusUpload } from '@/hooks/useStatusUpload';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useStatus');
jest.mock('@/hooks/useStatusUpload');
jest.mock('@/hooks/useProfilePhoto');

const mockDeleteStory = jest.fn().mockResolvedValue(undefined);
jest.mock('@/stores/status.store', () => ({
  useStatusStore: (selector: (s: { deleteStory: jest.Mock }) => unknown) =>
    selector({ deleteStory: mockDeleteStory }),
}));

const mockedStatus = useStatus as jest.Mock;
const mockedUpload = useStatusUpload as jest.Mock;
const mockedPhoto = useProfilePhoto as jest.Mock;

const imageSlide = {
  id: 's1',
  imageUrl: 'http://x/img.jpg',
  mediaType: 'IMAGE',
  caption: '',
  createdAt: '2026-06-09T10:00:00.000Z',
  expiresAt: new Date(Date.now() + 3 * 3_600_000).toISOString(),
};
const mineGroup = {
  authorId: 'me',
  name: 'You',
  photo: null,
  slides: [imageSlide],
  cover: imageSlide,
};

const refetch = jest.fn();
const pick = jest.fn();
const upload = jest.fn();
const remove = jest.fn().mockResolvedValue(undefined);
const cancelPick = jest.fn();
const pickAndUpload = jest.fn().mockResolvedValue(undefined);

function setPhoto(over: Record<string, unknown> = {}) {
  mockedPhoto.mockReturnValue({
    picked: null,
    saving: false,
    error: null,
    pick,
    upload,
    remove,
    cancelPick,
    ...over,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedStatus.mockReturnValue({ mine: null, refetch });
  mockedUpload.mockReturnValue({ uploading: false, pickAndUpload });
  setPhoto();
});

describe('ProfileAvatar — photo menu (item 9)', () => {
  it('opens the menu via the edit pencil and shows Change without Remove when there is no photo', () => {
    renderWithProviders(<ProfileAvatar photo={null} initial="A" size={76} />);
    fireEvent.press(screen.getByTestId('avatar-story-button-edit'));
    expect(screen.getByTestId('photo-action-change')).toBeOnTheScreen();
    expect(screen.queryByTestId('photo-action-view')).toBeNull();
    expect(screen.queryByTestId('photo-action-remove')).toBeNull();
  });

  it('opens the menu on long-press and shows View/Change/Remove when a photo exists', () => {
    renderWithProviders(<ProfileAvatar photo="http://x/a.jpg" initial="A" size={76} />);
    fireEvent(screen.getByTestId('avatar-story-button'), 'longPress');
    expect(screen.getByTestId('photo-action-view')).toBeOnTheScreen();
    expect(screen.getByTestId('photo-action-change')).toBeOnTheScreen();
    expect(screen.getByTestId('photo-action-remove')).toBeOnTheScreen();
  });

  it('View photo opens the image viewer', () => {
    renderWithProviders(<ProfileAvatar photo="http://x/a.jpg" initial="A" size={76} />);
    fireEvent(screen.getByTestId('avatar-story-button'), 'longPress');
    fireEvent.press(screen.getByTestId('photo-action-view'));
    expect(screen.getByTestId('image-viewer')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('image-viewer-close'));
  });

  it('Change photo triggers the picker', () => {
    renderWithProviders(<ProfileAvatar photo="http://x/a.jpg" initial="A" size={76} />);
    fireEvent(screen.getByTestId('avatar-story-button'), 'longPress');
    fireEvent.press(screen.getByTestId('photo-action-change'));
    expect(pick).toHaveBeenCalled();
  });

  it('closes the menu when the backdrop is tapped', () => {
    renderWithProviders(<ProfileAvatar photo="http://x/a.jpg" initial="A" size={76} />);
    fireEvent(screen.getByTestId('avatar-story-button'), 'longPress');
    fireEvent.press(screen.getByLabelText('Close'));
    expect(screen.queryByTestId('photo-action-view')).toBeNull();
  });

  it('confirms a remove and calls the remove mutation', async () => {
    renderWithProviders(<ProfileAvatar photo="http://x/a.jpg" initial="A" size={76} />);
    fireEvent(screen.getByTestId('avatar-story-button'), 'longPress');
    fireEvent.press(screen.getByTestId('photo-action-remove'));
    expect(screen.getByTestId('remove-photo-confirm')).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId('remove-photo-confirm-confirm'));
    });
    expect(remove).toHaveBeenCalled();
  });

  it('cancels the remove confirm', () => {
    renderWithProviders(<ProfileAvatar photo="http://x/a.jpg" initial="A" size={76} />);
    fireEvent(screen.getByTestId('avatar-story-button'), 'longPress');
    fireEvent.press(screen.getByTestId('photo-action-remove'));
    fireEvent.press(screen.getByTestId('remove-photo-confirm-cancel'));
    expect(remove).not.toHaveBeenCalled();
  });
});

describe('ProfileAvatar — crop dialog (item 9)', () => {
  it('renders the crop dialog while an image is staged and confirms an upload', async () => {
    setPhoto({ picked: { uri: 'file://p.jpg', width: 1000, height: 800 } });
    upload.mockResolvedValue(undefined);
    renderWithProviders(<ProfileAvatar photo={null} initial="A" size={76} />);
    expect(screen.getByTestId('crop-dialog')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('crop-zoom-in'));
    fireEvent.press(screen.getByTestId('crop-zoom-out'));
    fireEvent.press(screen.getByTestId('crop-rotate'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('crop-confirm'));
    });
    await waitFor(() => expect(upload).toHaveBeenCalled());
  });

  it('discards the staged crop via the bottom button and the close icon', () => {
    setPhoto({ picked: { uri: 'file://p.jpg', width: 1000, height: 800 } });
    const { rerender } = renderWithProviders(<ProfileAvatar photo={null} initial="A" size={76} />);
    fireEvent.press(screen.getByTestId('crop-cancel-btn'));
    expect(cancelPick).toHaveBeenCalledTimes(1);
    rerender(<ProfileAvatar photo={null} initial="A" size={76} />);
    fireEvent.press(screen.getByTestId('crop-cancel'));
    expect(cancelPick).toHaveBeenCalledTimes(2);
  });

  it('blocks confirm and shows the spinner while a save is in flight', async () => {
    setPhoto({ picked: { uri: 'file://p.jpg', width: 1000, height: 800 }, saving: true });
    renderWithProviders(<ProfileAvatar photo={null} initial="A" size={76} />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('crop-confirm'));
    });
    expect(upload).not.toHaveBeenCalled();
  });
});

describe('ProfileAvatar — story interaction (item 12)', () => {
  it('tapping the avatar with no story starts adding one', async () => {
    renderWithProviders(<ProfileAvatar photo={null} initial="A" size={76} onChanged={refetch} />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('avatar-story-button'));
    });
    expect(pickAndUpload).toHaveBeenCalled();
  });

  it('does not add a story while an upload is in flight', async () => {
    mockedUpload.mockReturnValue({ uploading: true, pickAndUpload });
    renderWithProviders(<ProfileAvatar photo={null} initial="A" size={76} />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('avatar-story-button'));
    });
    expect(pickAndUpload).not.toHaveBeenCalled();
  });

  it('tapping the avatar with an active story opens the viewer, then closes it', () => {
    mockedStatus.mockReturnValue({ mine: mineGroup, refetch });
    renderWithProviders(<ProfileAvatar photo="http://x/a.jpg" initial="A" size={76} />);
    fireEvent.press(screen.getByTestId('avatar-story-button'));
    expect(screen.getByTestId('status-viewer')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('status-viewer-close'));
    expect(screen.queryByTestId('status-viewer')).toBeNull();
  });

  it('the + badge always starts a new story', async () => {
    mockedStatus.mockReturnValue({ mine: mineGroup, refetch });
    renderWithProviders(<ProfileAvatar photo="http://x/a.jpg" initial="A" size={76} />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('avatar-story-button-add-story'));
    });
    expect(pickAndUpload).toHaveBeenCalled();
  });

  it('deletes the current story from the viewer after confirming', async () => {
    mockedStatus.mockReturnValue({ mine: mineGroup, refetch });
    renderWithProviders(
      <ProfileAvatar photo="http://x/a.jpg" initial="A" size={76} onChanged={refetch} />,
    );
    fireEvent.press(screen.getByTestId('avatar-story-button'));
    fireEvent.press(screen.getByTestId('status-viewer-delete'));
    expect(screen.getByTestId('delete-story-confirm')).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-story-confirm-confirm'));
    });
    expect(mockDeleteStory).toHaveBeenCalledWith('s1');
    expect(refetch).toHaveBeenCalled();
  });

  it('cancels the delete-story confirm', () => {
    mockedStatus.mockReturnValue({ mine: mineGroup, refetch });
    renderWithProviders(<ProfileAvatar photo="http://x/a.jpg" initial="A" size={76} />);
    fireEvent.press(screen.getByTestId('avatar-story-button'));
    fireEvent.press(screen.getByTestId('status-viewer-delete'));
    fireEvent.press(screen.getByTestId('delete-story-confirm-cancel'));
    expect(mockDeleteStory).not.toHaveBeenCalled();
  });
});
