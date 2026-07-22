import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MockedProvider } from '@apollo/client/testing';
import SurveyGatePage from '../index';
import { ACTIVE_SURVEY_FOR, REQUEST_MEETING, SUBMIT_SURVEY_RESPONSE } from '../queries';
import { clearGateDraft } from '../draft';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../../components/AuthLogo', () => ({ default: () => <div data-testid="auth-logo" /> }));

vi.mock('../CategoryStep', () => ({
  default: ({ onContinue, submitting }: { onContinue: (s: unknown, l: unknown) => void; submitting: boolean }) => (
    <button
      type="button"
      data-testid="category-continue"
      disabled={submitting}
      onClick={() =>
        onContinue(
          { super_category_id: 'S1', category_id: 'C1', sub_category_id: 'SUB1' },
          { super: 'Sup', category: 'Cat', sub: 'Sub' },
        )
      }
    >
      continue-category
    </button>
  ),
}));

vi.mock('../CategorySummaryBanner', () => ({
  default: ({ onChange }: { onChange: () => void }) => (
    <button type="button" data-testid="banner-change" onClick={onChange}>
      change
    </button>
  ),
}));

vi.mock('../SurveyStepper', () => ({
  default: ({ onSubmit, submitting }: { onSubmit: (a: unknown[]) => void; submitting: boolean }) => (
    <button
      type="button"
      data-testid="survey-submit"
      disabled={submitting}
      onClick={() => onSubmit([{ qid: 'q1', values: ['a'] }])}
    >
      submit-survey
    </button>
  ),
}));

vi.mock('../SubmittedSummary', () => ({ default: () => <div data-testid="submitted-summary" /> }));

vi.mock('../MeetingForm', () => ({
  default: ({ onSubmit, error }: { onSubmit: (i: unknown) => void; error?: string | null }) => (
    <div>
      {error && <div data-testid="meeting-error">{error}</div>}
      <button
        type="button"
        data-testid="meeting-submit"
        onClick={() => onSubmit({ requested_at: '2026-08-01T10:00:00.000Z', notes: 'x' })}
      >
        submit-meeting
      </button>
    </div>
  ),
}));

const SURVEY = { id: 'SV1', kind: 'VENUE', title: 'My Survey', questions: [] };

const surveyMock = (survey: unknown) => ({
  request: {
    query: ACTIVE_SURVEY_FOR,
    variables: { kind: 'VENUE', super_category_id: 'S1', category_id: 'C1', sub_category_id: 'SUB1' },
  },
  result: { data: { activeSurveyFor: survey } },
});

const submitMock = {
  request: { query: SUBMIT_SURVEY_RESPONSE, variables: { survey_id: 'SV1', answers: [{ qid: 'q1', values: ['a'] }] } },
  result: { data: { submitSurveyResponse: { survey_id: 'SV1', submitted_at: '2026-08-01' } } },
};

const meetingMock = (ok = true) => ({
  request: {
    query: REQUEST_MEETING,
    variables: {
      kind: 'VENUE',
      input: {
        requested_at: '2026-08-01T10:00:00.000Z',
        notes: 'x',
        super_category_id: 'S1',
        category_id: 'C1',
        sub_category_id: 'SUB1',
      },
    },
  },
  ...(ok
    ? { result: { data: { requestMeeting: { id: 'M1' } } } }
    : { error: new Error('slot taken') }),
});

const renderGate = (mocks: unknown[], kind = 'venue') =>
  render(
    <MockedProvider mocks={mocks as never} addTypename={false}>
      <MemoryRouter initialEntries={[`/gate/${kind}`]}>
        <Routes>
          <Route path="/gate/:kind" element={<SurveyGatePage />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );

describe('SurveyGatePage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    (['VENUE', 'HOST', 'ECOMM', 'CLUB_ADMIN'] as const).forEach(clearGateDraft);
  });

  it('redirects to /hosts-venues for an invalid kind', async () => {
    renderGate([], 'bogus');
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/hosts-venues', { replace: true }));
  });

  it('starts on the category step with the kind heading', async () => {
    renderGate([]);
    expect(await screen.findByText('Register your venue')).toBeInTheDocument();
    expect(screen.getByText('Tell us your category so we can ask the right questions.')).toBeInTheDocument();
    expect(screen.getByTestId('category-continue')).toBeInTheDocument();
  });

  it('walks category → survey → meeting → thanks with a resolved survey', async () => {
    renderGate([surveyMock(SURVEY), submitMock, meetingMock(true)]);

    fireEvent.click(await screen.findByTestId('category-continue'));

    // Survey step (title becomes heading)
    expect(await screen.findByTestId('survey-submit')).toBeInTheDocument();
    expect(screen.getByText('My Survey')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('survey-submit'));

    // Meeting step
    expect(await screen.findByTestId('meeting-submit')).toBeInTheDocument();
    expect(screen.getByText('Book your onboarding meeting')).toBeInTheDocument();
    expect(screen.getByTestId('submitted-summary')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('meeting-submit'));

    // Thanks step
    expect(await screen.findByText("You’re booked!")).toBeInTheDocument();
    expect(screen.getByText(/Thank you for your submission/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Home' }));
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('skips the survey step when no active survey is resolved', async () => {
    renderGate([surveyMock(null)]);
    fireEvent.click(await screen.findByTestId('category-continue'));
    // Goes straight to the meeting step
    expect(await screen.findByTestId('meeting-submit')).toBeInTheDocument();
    expect(screen.getByText('Book your onboarding meeting')).toBeInTheDocument();
    // No submitted summary because there was no survey
    expect(screen.queryByTestId('submitted-summary')).toBeNull();
  });

  it('shows an error when booking the meeting fails', async () => {
    renderGate([surveyMock(null), meetingMock(false)]);
    fireEvent.click(await screen.findByTestId('category-continue'));
    fireEvent.click(await screen.findByTestId('meeting-submit'));
    expect(await screen.findByTestId('meeting-error')).toHaveTextContent('slot taken');
  });

  it('Back button moves between phases and finally navigates(-1)', async () => {
    renderGate([surveyMock(SURVEY), submitMock, meetingMock(true)]);
    fireEvent.click(await screen.findByTestId('category-continue'));
    fireEvent.click(await screen.findByTestId('survey-submit'));
    await screen.findByTestId('meeting-submit');

    const back = () => fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    // meeting → survey
    back();
    expect(await screen.findByTestId('survey-submit')).toBeInTheDocument();
    // survey → category
    back();
    expect(await screen.findByTestId('category-continue')).toBeInTheDocument();
    // category → navigate(-1)
    back();
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('the summary banner "change" returns to the category step from survey', async () => {
    renderGate([surveyMock(SURVEY)]);
    fireEvent.click(await screen.findByTestId('category-continue'));
    await screen.findByTestId('survey-submit');
    fireEvent.click(screen.getByTestId('banner-change'));
    expect(await screen.findByTestId('category-continue')).toBeInTheDocument();
  });

  it('restores an in-progress draft on remount', async () => {
    const { unmount } = renderGate([surveyMock(SURVEY), submitMock]);
    fireEvent.click(await screen.findByTestId('category-continue'));
    fireEvent.click(await screen.findByTestId('survey-submit'));
    await screen.findByTestId('meeting-submit'); // draft now persisted at meeting step
    unmount();

    // Remount without any category interaction: draft should drop us back on meeting
    renderGate([]);
    expect(await screen.findByTestId('meeting-submit')).toBeInTheDocument();
  });

  it('renders the correct heading for the HOST kind', async () => {
    renderGate([], 'host');
    expect(await screen.findByText('Become a host')).toBeInTheDocument();
  });
});
