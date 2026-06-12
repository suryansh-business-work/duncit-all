import { fireEvent, screen } from '@testing-library/react-native';

import { PolicyScreen } from '@/screens/PolicyScreen';
import { usePolicy } from '@/hooks/usePolicies';
import { renderWithProviders } from '@/utils/test-utils';

const mockBack = jest.fn();
let mockRouteParams: { slug: string } | undefined = { slug: 'terms' };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: mockBack }),
  useRoute: () => ({ params: mockRouteParams }),
}));
jest.mock('@/hooks/usePolicies', () => ({ usePolicy: jest.fn() }));
const mockDownload = jest.fn();
let mockPdfBusy = false;
jest.mock('@/hooks/usePolicyPdf', () => ({
  usePolicyPdf: () => ({ download: mockDownload, busy: mockPdfBusy }),
}));

const mockedUsePolicy = jest.mocked(usePolicy);

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = { slug: 'terms' };
  mockPdfBusy = false;
});

describe('PolicyScreen', () => {
  it('defaults the slug to empty when no route params are present', () => {
    mockRouteParams = undefined;
    mockedUsePolicy.mockReturnValue({ isLoading: true } as never);
    renderWithProviders(<PolicyScreen />);
    expect(mockedUsePolicy).toHaveBeenCalledWith('');
  });

  it('shows a loader while fetching', () => {
    mockedUsePolicy.mockReturnValue({ isLoading: true } as never);
    renderWithProviders(<PolicyScreen />);
    expect(screen.getByTestId('policy-loading')).toBeOnTheScreen();
  });

  it('downloads the policy PDF (and swallows failures)', () => {
    mockedUsePolicy.mockReturnValue({
      isLoading: false,
      data: { policyBySlug: { title: 'Terms', content: '<p>Hi</p>' } },
    } as never);
    mockDownload.mockResolvedValueOnce(undefined);
    renderWithProviders(<PolicyScreen />);
    fireEvent.press(screen.getByTestId('policy-pdf'));
    expect(mockDownload).toHaveBeenCalledWith('terms');

    mockDownload.mockRejectedValueOnce(new Error('no pdf'));
    fireEvent.press(screen.getByTestId('policy-pdf'));
    expect(mockDownload).toHaveBeenCalledTimes(2);
  });

  it('ignores PDF taps while a download is in flight', () => {
    mockPdfBusy = true;
    mockedUsePolicy.mockReturnValue({
      isLoading: false,
      data: { policyBySlug: { title: 'Terms', content: '<p>Hi</p>' } },
    } as never);
    renderWithProviders(<PolicyScreen />);
    fireEvent.press(screen.getByTestId('policy-pdf'));
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it('renders tag-stripped content and goes back', () => {
    mockedUsePolicy.mockReturnValue({
      isLoading: false,
      data: { policyBySlug: { title: 'Terms', content: '<p>Hello</p><div>World</div>' } },
    } as never);
    renderWithProviders(<PolicyScreen />);
    expect(screen.getByText('Hello\n\nWorld')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('policy-back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('falls back when the policy has no content', () => {
    mockedUsePolicy.mockReturnValue({
      isLoading: false,
      data: { policyBySlug: { title: 'Terms', content: '' } },
    } as never);
    renderWithProviders(<PolicyScreen />);
    expect(screen.getByText('This policy has no content yet.')).toBeOnTheScreen();
  });

  it('surfaces a fetch error', () => {
    mockedUsePolicy.mockReturnValue({ isLoading: false, error: new Error('boom') } as never);
    renderWithProviders(<PolicyScreen />);
    expect(screen.getByTestId('policy-error')).toHaveTextContent('boom');
  });
});
