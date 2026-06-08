import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { OnboardingSurvey } from '@/components/survey-onboarding/OnboardingSurvey';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn() }) }));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const survey = {
  id: 'sv1',
  kind: 'VENUE',
  title: 'Venue onboarding',
  questions: [
    {
      qid: 's1',
      type: 'SECTION',
      label: 'About',
      help: 'Tell us more',
      required: false,
      multi: false,
      options: [],
    },
    {
      qid: 'q1',
      type: 'TEXT',
      label: 'Name',
      help: null,
      required: true,
      multi: false,
      options: [],
    },
    {
      qid: 'q2',
      type: 'TEXTAREA',
      label: 'Details',
      help: null,
      required: false,
      multi: false,
      options: [],
    },
    {
      qid: 'q3',
      type: 'MCQ',
      label: 'Pick one',
      help: null,
      required: true,
      multi: false,
      options: ['A', 'B'],
    },
    {
      qid: 'q4',
      type: 'MCQ',
      label: 'Pick many',
      help: null,
      required: false,
      multi: true,
      options: ['X', 'Y'],
    },
  ],
};

const SUPER = {
  id: 'super1',
  name: 'Weddings',
  level: 'SUPER',
  parent_id: null,
  is_active: true,
  sort_order: 0,
};

/** Route the mocked client by GraphQL operation name. */
function mockApi({
  surveyDone = false,
  meetingDone = false,
}: {
  surveyDone?: boolean;
  meetingDone?: boolean;
}) {
  mockRequest.mockImplementation((doc: any, variables: any) => {
    const op = doc?.definitions?.[0]?.name?.value;
    switch (op) {
      case 'MyMeeting':
        return Promise.resolve({ myMeeting: meetingDone ? { id: 'm1' } : null });
      case 'SurveyOnboardingCategories':
        return Promise.resolve({ categories: variables?.level === 'SUPER' ? [SUPER] : [] });
      case 'ActiveSurveyFor':
        return Promise.resolve({ activeSurveyFor: survey });
      case 'MySurveyResponse':
        return Promise.resolve({ mySurveyResponse: surveyDone ? { survey_id: 'sv1' } : null });
      case 'SubmitSurveyResponse':
        return Promise.resolve({ submitSurveyResponse: { survey_id: 'sv1' } });
      case 'RequestMeeting':
        return Promise.resolve({ requestMeeting: { id: 'm1' } });
      default:
        return Promise.resolve({});
    }
  });
}

const renderSurvey = () =>
  renderWithProviders(
    <OnboardingSurvey kind="VENUE" title="Be a host" subtitle="Sub" icon="storefront" />,
  );

/** Pick the super category and continue past the category step. */
async function passCategory() {
  fireEvent.press(await screen.findByTestId('cat-super1'));
  fireEvent.press(screen.getByTestId('primary-action'));
}

beforeEach(() => mockRequest.mockReset());

describe('OnboardingSurvey', () => {
  it('shows the placeholder when survey + meeting are already done', async () => {
    mockApi({ surveyDone: true, meetingDone: true });
    renderSurvey();
    await passCategory();
    expect(await screen.findByTestId('placeholder-screen')).toBeOnTheScreen();
  });

  it('falls back to the placeholder if the initial load fails', async () => {
    mockRequest.mockRejectedValue(new Error('network'));
    renderSurvey();
    expect(await screen.findByTestId('placeholder-screen')).toBeOnTheScreen();
  });

  it('category -> survey (validates) -> meeting -> done', async () => {
    mockApi({ surveyDone: false, meetingDone: false });
    renderSurvey();
    await passCategory();

    // Survey rendered (section help + question labels).
    expect(await screen.findByText('About')).toBeOnTheScreen();
    expect(screen.getByText('Tell us more')).toBeOnTheScreen();

    // Submit with required unanswered -> validation error.
    fireEvent.press(screen.getByTestId('primary-action'));
    expect(await screen.findByText(/Please answer: Name/)).toBeOnTheScreen();

    // Fill text, textarea, single MCQ, toggle multi MCQ (on then off then on).
    fireEvent.changeText(screen.getByTestId('q-q1'), 'Asha');
    fireEvent.changeText(screen.getByTestId('q-q2'), 'Some details');
    fireEvent.press(screen.getByTestId('opt-q3-A'));
    fireEvent.press(screen.getByTestId('opt-q4-X'));
    fireEvent.press(screen.getByTestId('opt-q4-X'));
    fireEvent.press(screen.getByTestId('opt-q4-Y'));

    fireEvent.press(screen.getByTestId('primary-action'));

    // Meeting step appears.
    const when = await screen.findByTestId('meeting-when');

    // Invalid date -> error.
    fireEvent.press(screen.getByTestId('primary-action'));
    expect(await screen.findByText(/Enter a date & time/)).toBeOnTheScreen();

    // Valid date + notes -> requests meeting -> placeholder.
    fireEvent.changeText(when, '2026-07-01 15:30');
    fireEvent.changeText(screen.getByTestId('meeting-notes'), 'Afternoon please');
    fireEvent.press(screen.getByTestId('primary-action'));

    expect(await screen.findByTestId('placeholder-screen')).toBeOnTheScreen();
    await waitFor(() =>
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ definitions: expect.anything() }),
        expect.objectContaining({ survey_id: 'sv1', answers: expect.any(Array) }),
        { auth: true },
      ),
    );
  });

  it('skips to the meeting step when the matched survey is already done', async () => {
    mockApi({ surveyDone: true, meetingDone: false });
    renderSurvey();
    await passCategory();
    expect(await screen.findByTestId('meeting-when')).toBeOnTheScreen();
  });
});
