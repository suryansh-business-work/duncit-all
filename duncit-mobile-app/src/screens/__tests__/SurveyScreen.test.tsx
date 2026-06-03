import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { SurveyScreen } from '@/screens/SurveyScreen';
import { useSurveyData } from '@/hooks/useSurvey';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/components/AppHeader', () => ({ AppHeader: () => null }));
jest.mock('@/hooks/useSurvey', () => ({
  ...jest.requireActual('@/hooks/useSurvey'),
  useSurveyData: jest.fn(),
}));

const mockSave = jest.fn();
let mockSaving = false;
jest.mock('@/stores/survey.store', () => ({
  useSurveyStore: (selector: (s: { save: jest.Mock; saving: boolean }) => unknown) =>
    selector({ save: mockSave, saving: mockSaving }),
}));

const mockComplete = jest.fn();
jest.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (s: { completeSurvey: jest.Mock }) => unknown) =>
    selector({ completeSurvey: mockComplete }),
}));

const mockedData = jest.mocked(useSurveyData);

const TREE = [
  { id: 's1', name: 'For You', icon: null, parent_id: null, is_active: true },
  { id: 'c1', name: 'Art', icon: '🎨', parent_id: 's1', is_active: true },
  { id: 'c2', name: 'Music', icon: null, parent_id: 's1', is_active: true },
  { id: 'c3', name: 'Dance', icon: null, parent_id: 's1', is_active: true },
];

function setData(over: Record<string, unknown> = {}) {
  mockedData.mockReturnValue({
    data: { me: { interest_category_ids: [] }, categoryTree: TREE },
    isLoading: false,
    error: null,
    ...over,
  } as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSaving = false;
  mockSave.mockResolvedValue(undefined);
  setData();
});

describe('SurveyScreen', () => {
  it('renders the heading and chips', () => {
    renderWithProviders(<SurveyScreen />);
    expect(screen.getByText("What's your vibe? ✨")).toBeOnTheScreen();
    expect(screen.getByTestId('chip-c1')).toBeOnTheScreen();
  });

  it('saves and completes the survey after 3 picks', async () => {
    renderWithProviders(<SurveyScreen />);
    fireEvent.press(screen.getByTestId('chip-c1'));
    fireEvent.press(screen.getByTestId('chip-c2'));
    fireEvent.press(screen.getByTestId('chip-c3'));
    fireEvent.press(screen.getByTestId('survey-submit'));
    await waitFor(() => expect(mockSave).toHaveBeenCalledWith(['c1', 'c2', 'c3']));
    expect(mockComplete).toHaveBeenCalled();
  });

  it('shows a loader while loading and a fetch error', () => {
    setData({ data: undefined, isLoading: true });
    const { rerender } = renderWithProviders(<SurveyScreen />);
    expect(screen.getByTestId('survey-loading')).toBeOnTheScreen();
    setData({ data: undefined, isLoading: false, error: new Error('boom') });
    rerender(<SurveyScreen />);
    expect(screen.getByTestId('survey-error')).toHaveTextContent('boom');
  });

  it('surfaces a save error', async () => {
    const { ApiError } = jest.requireActual('@/utils/errors');
    mockSave.mockRejectedValue(new ApiError('Server is down'));
    renderWithProviders(<SurveyScreen />);
    fireEvent.press(screen.getByTestId('chip-c1'));
    fireEvent.press(screen.getByTestId('chip-c2'));
    fireEvent.press(screen.getByTestId('chip-c3'));
    fireEvent.press(screen.getByTestId('survey-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('survey-op-error')).toHaveTextContent('Server is down'),
    );
    expect(mockComplete).not.toHaveBeenCalled();
  });
});
