import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { VerificationScreen } from '@/screens/VerificationScreen';
import { useVerifications } from '@/hooks/useVerifications';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useVerifications', () => ({ useVerifications: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: jest.fn(), goBack: jest.fn() }),
}));

const mockedVerifications = useVerifications as jest.Mock;
const uploadIdentityImage = jest.fn().mockResolvedValue(undefined);
const uploadIdentityPdf = jest.fn().mockResolvedValue(undefined);
const submitAddress = jest.fn().mockResolvedValue(undefined);

const baseItems = [
  {
    type: 'IDENTITY',
    status: 'NOT_SUBMITTED',
    document_url: null,
    address: null,
    reject_reason: null,
  },
  {
    type: 'ADDRESS',
    status: 'NOT_SUBMITTED',
    document_url: null,
    address: null,
    reject_reason: null,
  },
  {
    type: 'EMAIL',
    status: 'VERIFIED_BY_APP',
    document_url: null,
    address: null,
    reject_reason: null,
  },
];

function setup(over: Record<string, unknown> = {}) {
  mockedVerifications.mockReturnValue({
    items: baseItems,
    isLoading: false,
    busyType: null,
    docError: null,
    uploadIdentityImage,
    uploadIdentityPdf,
    submitAddress,
    ...over,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setup();
});

describe('VerificationScreen', () => {
  it('shows the loading skeleton', () => {
    setup({ items: [], isLoading: true });
    renderWithProviders(<VerificationScreen />);
    expect(screen.getByTestId('verification-loading')).toBeOnTheScreen();
  });

  it('renders the three type cards with their labels and status chips', () => {
    renderWithProviders(<VerificationScreen />);
    expect(screen.getByText('Identity')).toBeOnTheScreen();
    expect(screen.getByText('Address')).toBeOnTheScreen();
    expect(screen.getByText('Email')).toBeOnTheScreen();
    expect(screen.getByText('Verified by the App')).toBeOnTheScreen();
    expect(screen.getAllByText('Not Verified')).toHaveLength(2);
  });

  it('uploads an identity photo and PDF (swallowing rejections)', async () => {
    uploadIdentityImage.mockRejectedValueOnce(new Error('cancelled'));
    uploadIdentityPdf.mockRejectedValueOnce(new Error('cancelled'));
    renderWithProviders(<VerificationScreen />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('verification-upload-photo'));
    });
    expect(uploadIdentityImage).toHaveBeenCalled();
    await act(async () => {
      fireEvent.press(screen.getByTestId('verification-upload-pdf'));
    });
    expect(uploadIdentityPdf).toHaveBeenCalled();
  });

  it('shows the document-too-large error', () => {
    setup({ docError: 'File is too large — choose a document under 4 MB.' });
    renderWithProviders(<VerificationScreen />);
    expect(screen.getByTestId('verification-doc-error')).toBeOnTheScreen();
  });

  it('hides identity upload buttons once approved', () => {
    setup({
      items: [
        {
          type: 'IDENTITY',
          status: 'APPROVED',
          document_url: 'u',
          address: null,
          reject_reason: null,
        },
        baseItems[1],
        baseItems[2],
      ],
    });
    renderWithProviders(<VerificationScreen />);
    expect(screen.queryByTestId('verification-upload-photo')).toBeNull();
    expect(screen.getByText('Verified')).toBeOnTheScreen();
  });

  it('shows the rejection reason on a rejected identity', () => {
    setup({
      items: [
        {
          type: 'IDENTITY',
          status: 'REJECTED',
          document_url: 'u',
          address: null,
          reject_reason: 'Blurry document',
        },
        baseItems[1],
        baseItems[2],
      ],
    });
    renderWithProviders(<VerificationScreen />);
    expect(screen.getByText('Blurry document')).toBeOnTheScreen();
    expect(screen.getByText('Rejected')).toBeOnTheScreen();
  });

  it('validates and submits the address form', async () => {
    // A rejected submit is swallowed by the screen's catch handler.
    submitAddress.mockRejectedValueOnce(new Error('nope'));
    renderWithProviders(<VerificationScreen />);
    // Empty submit surfaces validation errors and does not call the API.
    await act(async () => {
      fireEvent.press(screen.getByTestId('verification-submit-address'));
    });
    await waitFor(() => expect(screen.getByTestId('state-error')).toBeOnTheScreen());
    expect(submitAddress).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('field-state'), 'Maharashtra');
    fireEvent.changeText(screen.getByTestId('field-city'), 'Mumbai');
    fireEvent.changeText(screen.getByTestId('field-pincode'), '400001');
    fireEvent.changeText(screen.getByTestId('field-line1'), '1 Road');
    await act(async () => {
      fireEvent.press(screen.getByTestId('verification-submit-address'));
    });
    await waitFor(() =>
      expect(submitAddress).toHaveBeenCalledWith({
        line1: '1 Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      }),
    );
  });

  it('prefills the address form and hides it once approved', () => {
    setup({
      items: [
        baseItems[0],
        {
          type: 'ADDRESS',
          status: 'APPROVED',
          document_url: null,
          address: {
            line1: '1 Road',
            line2: 'Flat 2',
            city: 'Mumbai',
            state: 'MH',
            pincode: '400001',
            country: 'India',
          },
          reject_reason: null,
        },
        baseItems[2],
      ],
    });
    renderWithProviders(<VerificationScreen />);
    // Approved address has no submit button.
    expect(screen.queryByTestId('verification-submit-address')).toBeNull();
  });

  it('shows the Update label and prefilled values when an address is pending', () => {
    setup({
      items: [
        baseItems[0],
        {
          type: 'ADDRESS',
          status: 'PENDING',
          document_url: null,
          address: {
            line1: '1 Road',
            line2: null,
            city: 'Mumbai',
            state: 'MH',
            pincode: '400001',
            country: null,
          },
          reject_reason: null,
        },
        baseItems[2],
      ],
    });
    renderWithProviders(<VerificationScreen />);
    expect(screen.getByText('Update address')).toBeOnTheScreen();
    expect(screen.getAllByText('Under review')).toHaveLength(1);
  });

  it('shows Not Verified for an unverified email', () => {
    setup({
      items: [
        baseItems[0],
        baseItems[1],
        {
          type: 'EMAIL',
          status: 'NOT_SUBMITTED',
          document_url: null,
          address: null,
          reject_reason: null,
        },
      ],
    });
    renderWithProviders(<VerificationScreen />);
    expect(screen.getByText(/verified when you sign in/)).toBeOnTheScreen();
    expect(screen.getAllByText('Not Verified')).toHaveLength(3);
  });

  it('shows busy spinners on the identity buttons and the address submit', () => {
    setup({ busyType: 'IDENTITY' });
    const { rerender } = renderWithProviders(<VerificationScreen />);
    // Busy identity buttons render a spinner in place of the icon.
    expect(screen.getByTestId('verification-upload-photo')).toBeOnTheScreen();

    setup({ busyType: 'ADDRESS' });
    rerender(<VerificationScreen />);
    expect(screen.getByTestId('address-busy')).toBeOnTheScreen();
  });

  it('coalesces null address fields to empty strings in the form', () => {
    setup({
      items: [
        baseItems[0],
        {
          type: 'ADDRESS',
          status: 'REJECTED',
          document_url: null,
          address: {
            line1: null,
            line2: null,
            city: null,
            state: null,
            pincode: null,
            country: null,
          },
          reject_reason: 'Incomplete',
        },
        baseItems[2],
      ],
    });
    renderWithProviders(<VerificationScreen />);
    expect(screen.getByTestId('field-state').props.value).toBe('');
    expect(screen.getByText('Incomplete')).toBeOnTheScreen();
  });
});
