import { fireEvent, screen } from '@testing-library/react-native';

import { StatusRail } from '@/components/status/StatusRail';
import { StatusTile } from '@/components/status/StatusTile';
import { StatusViewer } from '@/components/status/StatusViewer';
import { useStatus } from '@/hooks/useStatus';
import { useStatusUpload } from '@/hooks/useStatusUpload';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useStatus');
jest.mock('@/hooks/useStatusUpload');

const mockedStatus = useStatus as jest.Mock;
const mockedUpload = useStatusUpload as jest.Mock;

const group = {
  authorId: 'a1',
  name: 'Asha',
  photo: null,
  latest: {
    id: 'p1',
    author_id: 'a1',
    image_url: 'http://x/img.jpg',
    caption: 'Hello',
    created_at: '2026-06-09T10:00:00.000Z',
  },
};

describe('StatusTile', () => {
  it('fires onPress', () => {
    const onPress = jest.fn();
    renderWithProviders(<StatusTile testID="tile" label="You" badge ring onPress={onPress} />);
    fireEvent.press(screen.getByTestId('tile'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('StatusViewer', () => {
  it('renders the image and closes', () => {
    const onClose = jest.fn();
    renderWithProviders(<StatusViewer status={group as never} onClose={onClose} />);
    expect(screen.getByTestId('status-viewer-image')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('status-viewer-close'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('StatusRail', () => {
  beforeEach(() => {
    mockedUpload.mockReturnValue({ uploading: false, pickAndUpload: jest.fn() });
    mockedStatus.mockReturnValue({ statuses: [group], myLatest: undefined });
  });

  it('triggers upload from the own tile', () => {
    const pickAndUpload = jest.fn();
    mockedUpload.mockReturnValue({ uploading: false, pickAndUpload });
    renderWithProviders(<StatusRail userName="Sam" />);
    fireEvent.press(screen.getByTestId('status-mine'));
    expect(pickAndUpload).toHaveBeenCalled();
  });

  it('opens the viewer when a status is tapped', () => {
    renderWithProviders(<StatusRail userName="Sam" />);
    fireEvent.press(screen.getByTestId('status-a1'));
    expect(screen.getByTestId('status-viewer-image')).toBeOnTheScreen();
  });
});
