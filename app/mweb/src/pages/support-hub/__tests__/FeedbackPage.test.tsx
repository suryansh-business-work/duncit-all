import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MockedProvider } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import { SUBMIT_APP_FEEDBACK_SDL, buildAppFeedbackInput } from '@duncit/slack';
import FeedbackPage from '../FeedbackPage';

vi.mock('react-router-dom', async (io) => {
  const actual = await io<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => vi.fn() };
});

const SUBMIT = gql(SUBMIT_APP_FEEDBACK_SDL);
const MESSAGE = 'The app crashes when I open it';
const input = buildAppFeedbackInput({ category: 'Bug', message: MESSAGE, platform: 'web' });

const renderPage = (mocks: readonly unknown[]) =>
  render(
    <MockedProvider mocks={mocks as never}>
      <MemoryRouter>
        <FeedbackPage />
      </MemoryRouter>
    </MockedProvider>,
  );

const fillMessage = (value: string) =>
  fireEvent.change(screen.getByLabelText(/What's going on/i), { target: { value } });

describe('FeedbackPage', () => {
  it('sends feedback with the default category and confirms success', async () => {
    const mock = {
      request: { query: SUBMIT, variables: { input } },
      result: {
        data: {
          submitAppFeedback: { ok: true, channel: 'C_FB', ts: '1', __typename: 'SlackSendResult' },
        },
      },
    };
    renderPage([mock]);
    fillMessage(MESSAGE);
    fireEvent.click(screen.getByTestId('feedback-submit'));
    await waitFor(() =>
      expect(screen.getByText(/your feedback has been sent/i)).toBeInTheDocument(),
    );
  });

  it('blocks submission until the message is long enough', async () => {
    renderPage([]);
    fillMessage('short');
    fireEvent.click(screen.getByTestId('feedback-submit'));
    expect(await screen.findByText(/at least 10 characters/i)).toBeInTheDocument();
    expect(screen.queryByText(/your feedback has been sent/i)).not.toBeInTheDocument();
  });

  it('surfaces a server error without confirming success', async () => {
    const mock = {
      request: { query: SUBMIT, variables: { input } },
      result: { errors: [{ message: 'No Slack channel is configured for feedback' }] },
    };
    renderPage([mock]);
    fillMessage(MESSAGE);
    fireEvent.click(screen.getByTestId('feedback-submit'));
    expect(await screen.findByText(/No Slack channel is configured/i)).toBeInTheDocument();
    expect(screen.queryByText(/your feedback has been sent/i)).not.toBeInTheDocument();
  });
});
