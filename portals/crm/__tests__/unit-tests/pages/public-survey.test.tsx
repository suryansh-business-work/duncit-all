import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import PublicSurveyPage from '@/pages/public-survey';
import { LEAD_SURVEY_BY_TOKEN, PUBLIC_BRANDING, SUBMIT_LEAD_SURVEY_BY_TOKEN } from '@/pages/public-survey/queries';
import type { LeadSurveyDef } from '@/components/lead-survey/queries';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { question } from '../lead-survey/fixtures';

const TOKEN = 'tok-public';

const survey: LeadSurveyDef = {
  id: 'survey-host',
  title: 'Host onboarding',
  questions: [question({ qid: 'q1', label: 'Community name', required: true })],
};

const surveyMock = (payload: Record<string, unknown> | null): MockedResponse => ({
  request: { query: LEAD_SURVEY_BY_TOKEN, variables: { token: TOKEN } },
  result: { data: { leadSurveyByToken: payload } },
});

const brandingMock = (branding: { app_name: string; logo_url: string } | null): MockedResponse => ({
  request: { query: PUBLIC_BRANDING },
  result: { data: { branding } },
});

const submitMock = (outcome: { error?: Error }): MockedResponse => ({
  request: { query: SUBMIT_LEAD_SURVEY_BY_TOKEN, variables: { token: TOKEN, answers: [{ qid: 'q1', value: 'Pune Runners' }] } },
  ...(outcome.error ? { error: outcome.error } : { result: { data: { submitLeadSurveyByToken: true } } }),
});

const renderPage = (mocks: MockedResponse[]) =>
  renderWithApollo(<PublicSurveyPage />, mocks, { route: `/s/${TOKEN}`, path: '/s/:token' });

describe('PublicSurveyPage', () => {
  it('rejects a link that resolves to no survey, under the default brand', async () => {
    renderPage([surveyMock({ survey: null, lead_name: '', already_filled: false }), brandingMock(null)]);

    expect(await screen.findByText('This survey link is invalid or has been revoked.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Duncit' })).toHaveAttribute('src', '/duncit-logo.svg');
  });

  it('rejects a link the server refuses', async () => {
    renderPage([{ request: { query: LEAD_SURVEY_BY_TOKEN, variables: { token: TOKEN } }, error: new Error('Revoked') }, brandingMock(null)]);
    expect(await screen.findByText('This survey link is invalid or has been revoked.')).toBeInTheDocument();
  });

  it('does not show the form again once it was submitted', async () => {
    renderPage([
      surveyMock({ survey, lead_name: 'Pune Runners', already_filled: true }),
      brandingMock({ app_name: 'Duncit Partners', logo_url: 'https://cdn.duncit.com/logo.png' }),
    ]);

    expect(await screen.findByRole('heading', { name: 'Already submitted' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Duncit Partners' })).toHaveAttribute('src', 'https://cdn.duncit.com/logo.png');
  });

  it('names the lead, takes the answers and thanks the respondent', async () => {
    renderPage([surveyMock({ survey, lead_name: 'Pune Runners', already_filled: false }), brandingMock(null), submitMock({})]);

    expect(await screen.findByRole('heading', { level: 1, name: 'Host onboarding' })).toBeInTheDocument();
    expect(screen.getByText(/For Pune Runners — a few quick questions\./)).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Community name' }), { target: { value: 'Pune Runners' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByRole('heading', { name: 'Thank you!' })).toBeInTheDocument();
  });

  it('keeps the form when a submit fails, with an untitled survey for an unnamed lead', async () => {
    renderPage([
      surveyMock({ survey: { ...survey, title: '' }, lead_name: '', already_filled: false }),
      brandingMock(null),
      submitMock({ error: new Error('Link expired') }),
    ]);

    expect(await screen.findByRole('heading', { name: 'Quick survey' })).toBeInTheDocument();
    expect(screen.getByText(/^A few quick questions\./)).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Community name' }), { target: { value: 'Pune Runners' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Link expired')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Community name' })).toBeInTheDocument();
  });
});
