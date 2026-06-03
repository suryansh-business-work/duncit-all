import { fireEvent, screen } from '@testing-library/react-native';

import { PolicyScreen } from '@/screens/PolicyScreen';
import { usePolicy } from '@/hooks/usePolicies';
import { renderWithProviders } from '@/utils/test-utils';

const mockBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockBack }),
  useRoute: () => ({ params: { slug: 'terms' } }),
}));
jest.mock('@/hooks/usePolicies', () => ({ usePolicy: jest.fn() }));

const mockedUsePolicy = jest.mocked(usePolicy);

beforeEach(() => jest.clearAllMocks());

describe('PolicyScreen', () => {
  it('shows a loader while fetching', () => {
    mockedUsePolicy.mockReturnValue({ isLoading: true } as never);
    renderWithProviders(<PolicyScreen />);
    expect(screen.getByTestId('policy-loading')).toBeOnTheScreen();
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
