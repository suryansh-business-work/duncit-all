import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import { formatDateTime } from '@duncit/app-settings';
import UserSurveysSection from '../UserSurveysSection';
import { renderWithProviders } from './testkit';

/** Re-declared to match the section's own private query document exactly. */
const USER_SURVEYS = gql`
  query AdminUserSurveys($user_id: ID!) {
    userSurveyResponses(user_id: $user_id) {
      kind
      submitted_at
      items { qid label type answer }
    }
  }
`;

const USER_ID = 'u-surveys-1';

const surveysMock = (userSurveyResponses: unknown[]): MockedResponse => ({
  request: { query: USER_SURVEYS, variables: { user_id: USER_ID } },
  result: { data: { userSurveyResponses } },
});

describe('UserSurveysSection — no responses', () => {
  it('renders nothing while loading with no cached data yet', () => {
    renderWithProviders(<UserSurveysSection userId={USER_ID} />, {
      mocks: [surveysMock([])],
    });

    expect(document.querySelector('.MuiCard-root')).toBeNull();
    expect(screen.queryByText(/survey/i)).toBeNull();
  });

  it('shows the "no survey" copy once loaded with zero responses', async () => {
    renderWithProviders(<UserSurveysSection userId={USER_ID} />, { mocks: [surveysMock([])] });

    await waitFor(() =>
      expect(
        screen.getByText("This user hasn't submitted any onboarding survey yet."),
      ).toBeInTheDocument(),
    );
  });

  it('skips the query and shows the "no survey" copy immediately when there is no user id', () => {
    renderWithProviders(<UserSurveysSection userId="" />);

    expect(
      screen.getByText("This user hasn't submitted any onboarding survey yet."),
    ).toBeInTheDocument();
  });
});

describe('UserSurveysSection — with responses', () => {
  it('labels a VENUE response and a HOST response, and formats the submitted date', async () => {
    const submittedAt = '2026-02-14T09:30:00.000Z';
    renderWithProviders(<UserSurveysSection userId={USER_ID} />, {
      mocks: [
        surveysMock([
          {
            __typename: 'UserSurvey',
            kind: 'VENUE',
            submitted_at: submittedAt,
            items: [{ __typename: 'SurveyItem', qid: 'q1', label: 'Capacity', type: 'TEXT', answer: '80 people' }],
          },
          {
            __typename: 'UserSurvey',
            kind: 'HOST',
            submitted_at: null,
            items: [],
          },
        ]),
      ],
    });

    await waitFor(() => expect(screen.getByText('Venue survey')).toBeInTheDocument());
    expect(screen.getByText('Host survey')).toBeInTheDocument();
    expect(screen.getByText(`Submitted ${formatDateTime(submittedAt)}`)).toBeInTheDocument();
    expect(screen.getByText('Capacity')).toBeInTheDocument();
    expect(screen.getByText('80 people')).toBeInTheDocument();
  });

  it('shows the empty-answers copy for a response with no items, and no submitted line without a date', async () => {
    renderWithProviders(<UserSurveysSection userId={USER_ID} />, {
      mocks: [
        surveysMock([{ __typename: 'UserSurvey', kind: 'HOST', submitted_at: null, items: [] }]),
      ],
    });

    await waitFor(() => expect(screen.getByText('Host survey')).toBeInTheDocument());
    expect(screen.getByText('No answers.')).toBeInTheDocument();
    expect(screen.queryByText(/^Submitted /)).toBeNull();
  });

  it('dashes an item whose answer is an empty string', async () => {
    renderWithProviders(<UserSurveysSection userId={USER_ID} />, {
      mocks: [
        surveysMock([
          {
            __typename: 'UserSurvey',
            kind: 'VENUE',
            submitted_at: '2026-02-14T09:30:00.000Z',
            items: [{ __typename: 'SurveyItem', qid: 'q1', label: 'Notes', type: 'TEXT', answer: '' }],
          },
        ]),
      ],
    });

    await waitFor(() => expect(screen.getByText('Notes')).toBeInTheDocument());
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
