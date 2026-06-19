import { fireEvent, screen } from '@testing-library/react-native';

import { StatusRail } from '@/components/status/StatusRail';
import { renderWithProviders } from '@/utils/test-utils';

const mockUseStoryRail = jest.fn();
const mockUseStatusUpload = jest.fn();
jest.mock('@/hooks/useStoryRail', () => ({ useStoryRail: () => mockUseStoryRail() }));
jest.mock('@/hooks/useStatusUpload', () => ({ useStatusUpload: () => mockUseStatusUpload() }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const slide = {
  id: 's1',
  imageUrl: 'https://i/s.jpg',
  mediaType: 'IMAGE',
  caption: 'Hi',
  createdAt: '2026-06-09T10:00:00.000Z',
  expiresAt: null,
};

beforeEach(() => {
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
});
