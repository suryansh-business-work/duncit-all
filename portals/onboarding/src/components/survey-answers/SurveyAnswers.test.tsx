import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import SurveyAnswers from './SurveyAnswers';
import { USER_SURVEY_RESPONSES } from './queries';

const responses = [
  {
    kind: 'HOST',
    title: 'Host onboarding',
    items: [
      { label: 'How often will you host?', answer: 'Weekly' },
      { label: 'Anything else?', answer: '' },
    ],
  },
  { kind: 'VENUE', title: 'Venue onboarding', items: [{ label: 'Seats', answer: '40' }] },
];

const mock = (userSurveyResponses: unknown) => [
  {
    request: { query: USER_SURVEY_RESPONSES, variables: { user_id: 'u1' } },
    result: { data: { userSurveyResponses } },
  },
];

const renderAnswers = (data: unknown, props?: { title?: string }) =>
  render(
    <MockedProvider mocks={mock(data) as any}>
      <SurveyAnswers userId="u1" kind="HOST" {...props} />
    </MockedProvider>,
  );

describe('SurveyAnswers', () => {
  it('shows a spinner until the answers arrive', () => {
    renderAnswers(responses);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders only the answers for the requested kind', async () => {
    renderAnswers(responses);
    expect(await screen.findByText('How often will you host?')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    // The VENUE response belongs to a different journey.
    expect(screen.queryByText('Seats')).not.toBeInTheDocument();
  });

  it('renders an em dash for a question the applicant left blank', async () => {
    renderAnswers(responses);
    expect(await screen.findByText('Anything else?')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders the default heading, and none when title is blank', async () => {
    const { unmount } = renderAnswers(responses);
    expect(await screen.findByText('Survey answers')).toBeInTheDocument();
    unmount();

    renderAnswers(responses, { title: '' });
    expect(await screen.findByText('How often will you host?')).toBeInTheDocument();
    expect(screen.queryByText('Survey answers')).not.toBeInTheDocument();
  });

  it('says so when the applicant has nothing on file', async () => {
    renderAnswers([]);
    expect(await screen.findByText('No survey answers on file.')).toBeInTheDocument();
  });

  it('handles a null payload without crashing', async () => {
    renderAnswers(null);
    expect(await screen.findByText('No survey answers on file.')).toBeInTheDocument();
  });

  it('renders a response whose items list is missing', async () => {
    renderAnswers([{ kind: 'HOST', title: 'Host onboarding', items: null }]);
    expect(await screen.findByText('No survey answers on file.')).toBeInTheDocument();
  });

  it('skips the query entirely without a user id', () => {
    render(
      <MockedProvider mocks={[]}>
        <SurveyAnswers userId="" kind="HOST" />
      </MockedProvider>,
    );
    expect(screen.getByText('No survey answers on file.')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
