import { fireEvent, screen } from '@testing-library/react-native';

import { ExploreCreateButton } from '@/components/explore/ExploreCreateButton';
import { useStatusUpload } from '@/hooks/useStatusUpload';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useStatusUpload');
const mockedUpload = useStatusUpload as jest.Mock;

describe('ExploreCreateButton', () => {
  afterEach(() => jest.clearAllMocks());

  it('launches the create-post picker when tapped', () => {
    const pickAndUpload = jest.fn().mockResolvedValue(undefined);
    mockedUpload.mockReturnValue({ uploading: false, pickAndUpload });
    renderWithProviders(<ExploreCreateButton />);

    fireEvent.press(screen.getByTestId('explore-create-post'));
    expect(pickAndUpload).toHaveBeenCalled();
  });

  it('shows a spinner while uploading', () => {
    mockedUpload.mockReturnValue({ uploading: true, pickAndUpload: jest.fn() });
    renderWithProviders(<ExploreCreateButton />);
    expect(screen.getByTestId('explore-create-post')).toBeOnTheScreen();
  });
});
