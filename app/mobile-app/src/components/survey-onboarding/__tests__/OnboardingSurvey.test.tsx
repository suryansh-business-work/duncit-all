import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { OnboardingSurvey } from '@/components/survey-onboarding/OnboardingSurvey';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn() }),
}));
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
      case 'MeetingSlots':
        return Promise.resolve({
          meetingSlots: [
            {
              start_at: '2027-01-04T04:30:00.000Z',
              end_at: '2027-01-04T05:00:00.000Z',
              available: true,
            },
            {
              start_at: '2027-01-04T05:00:00.000Z',
              end_at: '2027-01-04T05:30:00.000Z',
              available: false,
            },
          ],
        });
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
  it('starts at the category step even when the meeting is already requested', async () => {
    mockApi({ meetingDone: true });
    renderSurvey();
    expect(await screen.findByTestId('cat-super1')).toBeOnTheScreen();
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

    // Meeting step appears with the slot grid.
    await screen.findByTestId('slot-2027-01-04T04:30:00.000Z');

    // No slot picked -> error.
    fireEvent.press(screen.getByTestId('primary-action'));
    expect(await screen.findByText(/Pick an available slot/)).toBeOnTheScreen();

    // Slot picked but no phone -> error.
    fireEvent.press(screen.getByTestId('slot-2027-01-04T04:30:00.000Z'));
    fireEvent.press(screen.getByTestId('primary-action'));
    expect(await screen.findByText(/Phone number is required/)).toBeOnTheScreen();

    // Phone + notes -> books the slot -> thank-you with the booked time.
    fireEvent.changeText(screen.getByTestId('meeting-phone'), '9876543210');
    fireEvent.changeText(screen.getByTestId('meeting-notes'), 'Afternoon please');
    fireEvent.press(screen.getByTestId('primary-action'));

    expect(await screen.findByTestId('onboarding-thanks')).toBeOnTheScreen();
    expect(screen.getByText(/join 5 minutes early/)).toBeOnTheScreen();
    await waitFor(() =>
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ definitions: expect.anything() }),
        expect.objectContaining({ survey_id: 'sv1', answers: expect.any(Array) }),
        { auth: true },
      ),
    );
  });

  it('re-prompts the survey even if it was answered before (until meeting is done)', async () => {
    mockApi({ surveyDone: true, meetingDone: false });
    renderSurvey();
    await passCategory();
    // The survey is shown again rather than skipped to the meeting.
    expect(await screen.findByText('About')).toBeOnTheScreen();
  });
});
