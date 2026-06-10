import { fireEvent, screen } from '@testing-library/react-native';

import { StatusRail } from '@/components/status/StatusRail';
import { renderWithProviders } from '@/utils/test-utils';

const mockUseStatus = jest.fn();
const mockUseStatusUpload = jest.fn();
jest.mock('@/hooks/useStatus', () => ({ useStatus: () => mockUseStatus() }));
jest.mock('@/hooks/useStatusUpload', () => ({ useStatusUpload: () => mockUseStatusUpload() }));

beforeEach(() => {
  mockUseStatus.mockReturnValue({
    statuses: [
      {
        authorId: 'a1',
        name: 'Asha',
        photo: null,
        latest: { image_url: 'https://i/s.jpg', caption: 'Hi' },
      },
    ],
    myLatest: null,
  });
  mockUseStatusUpload.mockReturnValue({ uploading: false, pickAndUpload: jest.fn() });
});

describe('StatusRail', () => {
  it('opens and closes the status viewer', () => {
    renderWithProviders(<StatusRail userName="You" />);
    fireEvent.press(screen.getByTestId('status-a1'));
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
