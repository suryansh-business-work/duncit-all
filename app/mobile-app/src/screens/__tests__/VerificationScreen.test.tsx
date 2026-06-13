import { act, fireEvent, screen } from '@testing-library/react-native';

import { VerificationScreen } from '@/screens/VerificationScreen';
import { useVerifications } from '@/hooks/useVerifications';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useVerifications', () => ({ useVerifications: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: jest.fn(), goBack: jest.fn() }),
}));

const mockedVerifications = useVerifications as jest.Mock;
const uploadFor = jest.fn().mockResolvedValue(undefined);

const items = [
  { type: 'IDENTITY', status: 'NOT_SUBMITTED', document_url: null, reject_reason: null },
  { type: 'EMAIL', status: 'APPROVED', document_url: null, reject_reason: null },
  { type: 'POLICE', status: 'REJECTED', document_url: 'x', reject_reason: 'Blurry document' },
  { type: 'SELFIE', status: 'PENDING', document_url: 'x', reject_reason: null },
];

beforeEach(() => {
  uploadFor.mockClear();
  mockedVerifications.mockReturnValue({
    items,
    isLoading: false,
    busyType: 'SELFIE',
    uploadFor,
  });
});

describe('VerificationScreen', () => {
  it('shows the loading skeleton', () => {
    mockedVerifications.mockReturnValue({ items: [], isLoading: true, busyType: null, uploadFor });
    renderWithProviders(<VerificationScreen />);
    expect(screen.getByTestId('verification-loading')).toBeOnTheScreen();
  });

  it('lists the types, shows status + reason, and uploads (ignoring busy rows)', async () => {
    // A rejected upload is swallowed by the screen's catch handler.
    uploadFor.mockRejectedValueOnce(new Error('cancelled'));
    renderWithProviders(<VerificationScreen />);
    expect(screen.getByText('Identity Verification')).toBeOnTheScreen();
    expect(screen.getByText('Blurry document')).toBeOnTheScreen();
    // Approved type has no upload button.
    expect(screen.queryByTestId('verification-upload-EMAIL')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId('verification-upload-IDENTITY'));
    });
    expect(uploadFor).toHaveBeenCalledWith('IDENTITY');

    // The busy (SELFIE) row's button is inert.
    fireEvent.press(screen.getByTestId('verification-upload-SELFIE'));
    expect(uploadFor).toHaveBeenCalledTimes(1);
  });
});
