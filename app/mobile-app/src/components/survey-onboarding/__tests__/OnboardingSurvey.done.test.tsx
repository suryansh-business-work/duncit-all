import { fireEvent, screen } from '@testing-library/react-native';

import { OnboardingSurvey } from '@/components/survey-onboarding/OnboardingSurvey';
import { useOnboardingFlow } from '@/components/survey-onboarding/useOnboardingFlow';
import { renderWithProviders } from '@/utils/test-utils';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: mockGoBack }) }));
jest.mock('@/hooks/useBranding', () => ({ useBranding: () => ({ data: undefined }) }));
jest.mock('@/components/survey-onboarding/useOnboardingFlow', () => ({
  useOnboardingFlow: jest.fn(),
}));
const mockedFlow = useOnboardingFlow as jest.Mock;

const doneFlow = (bookedSlot: string) => ({
  phase: 'done',
  survey: null,
  answer: { get: () => ({ value: '', values: [] }), set: jest.fn(), toggle: jest.fn() },
  slots: [],
  slotsLoading: false,
  selectedSlot: '',
  setSelectedSlot: jest.fn(),
  name: '',
  setName: jest.fn(),
  phone: '',
  setPhone: jest.fn(),
  notes: '',
  setNotes: jest.fn(),
  bookedSlot,
  busy: false,
  error: null,
  chooseCategory: jest.fn(),
  submitSurvey: jest.fn(),
  submitMeeting: jest.fn(),
});

beforeEach(() => jest.clearAllMocks());

describe('OnboardingSurvey done phase', () => {
  it('shows the thank-you with the booked slot and goes back from Done', () => {
    mockedFlow.mockReturnValue(doneFlow('2027-01-04T04:30:00.000Z'));
    renderWithProviders(
      <OnboardingSurvey kind="VENUE" title="Be a Venue Owner" subtitle="Sub" icon="add-business" />,
    );
    expect(screen.getByTestId('onboarding-thanks')).toBeOnTheScreen();
    expect(screen.getByText(/join 5 minutes early/)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('thanks-done'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('falls back to the placeholder when done without a booked slot', () => {
    mockedFlow.mockReturnValue(doneFlow(''));
    renderWithProviders(
      <OnboardingSurvey kind="VENUE" title="Be a Venue Owner" subtitle="Sub" icon="add-business" />,
    );
    expect(screen.getByTestId('placeholder-screen')).toBeOnTheScreen();
  });
});
