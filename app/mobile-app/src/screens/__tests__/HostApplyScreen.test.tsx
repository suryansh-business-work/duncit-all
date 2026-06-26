import { fireEvent, screen } from '@testing-library/react-native';

import { HostApplyScreen } from '@/screens/HostApplyScreen';
import { useHostRequestFlow } from '@/components/survey-onboarding/useHostRequestFlow';
import { useBranding } from '@/hooks/useBranding';
import { renderWithProviders } from '@/utils/test-utils';

const mockGoBack = jest.fn();
jest.mock('@/hooks/useGoBack', () => ({ useGoBack: () => mockGoBack }));
jest.mock('@/hooks/useBranding', () => ({ useBranding: jest.fn() }));
jest.mock('@/components/survey-onboarding/useHostRequestFlow', () => ({
  useHostRequestFlow: jest.fn(),
}));
jest.mock('@/components/survey-onboarding/HostRequestSuccess', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { HostRequestSuccess: () => <V testID="host-request-success" /> };
});
jest.mock('@/components/survey-onboarding/CategoryPhase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { CategoryPhase: () => <V testID="category-phase" /> };
});
jest.mock('@/components/survey-onboarding/SurveyPhase', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { SurveyPhase: () => <V testID="survey-phase" /> };
});

const mockedFlow = useHostRequestFlow as jest.Mock;
const mockedBranding = useBranding as jest.Mock;

const flow = (over: Record<string, unknown> = {}) => ({
  phase: 'category',
  survey: null,
  answer: { get: jest.fn(), set: jest.fn(), toggle: jest.fn() },
  busy: false,
  error: null,
  chooseCategory: jest.fn(),
  submitSurvey: jest.fn(),
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedBranding.mockReturnValue({ data: { branding: { logo_url: 'https://x/logo.png' } } });
});

describe('HostApplyScreen', () => {
  it('renders the category step with the brand logo and a back button', () => {
    mockedFlow.mockReturnValue(flow());
    renderWithProviders(<HostApplyScreen />);
    expect(screen.getByTestId('category-phase')).toBeOnTheScreen();
    expect(screen.getByText('Apply Now')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('host-apply-back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('renders the survey step with the survey title (no logo)', () => {
    mockedBranding.mockReturnValue({ data: { branding: {} } });
    mockedFlow.mockReturnValue(
      flow({ phase: 'survey', survey: { id: 'sv1', title: 'Sports survey', questions: [] } }),
    );
    renderWithProviders(<HostApplyScreen />);
    expect(screen.getByTestId('survey-phase')).toBeOnTheScreen();
    expect(screen.getByText('Sports survey')).toBeOnTheScreen();
  });

  it('falls back to the default title when the survey has no title', () => {
    mockedFlow.mockReturnValue(
      flow({ phase: 'survey', survey: { id: 'sv1', title: '', questions: [] } }),
    );
    renderWithProviders(<HostApplyScreen />);
    expect(screen.getByText('Apply Now')).toBeOnTheScreen();
  });

  it('renders the success screen', () => {
    mockedFlow.mockReturnValue(flow({ phase: 'success' }));
    renderWithProviders(<HostApplyScreen />);
    expect(screen.getByTestId('host-request-success')).toBeOnTheScreen();
  });
});
