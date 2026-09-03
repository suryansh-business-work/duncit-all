import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import OpenAiLogDrawer from '../../src/pages/openai-logs/OpenAiLogDrawer';
import { OPENAI_LOG_ONE, type OpenAiLogDetail } from '../../src/pages/openai-logs/queries';
import { renderWithProviders } from '../testkit';

/**
 * One OpenAI call, as it happened.
 *
 * This is the screen someone opens when an AI feature answered oddly or cost
 * more than expected, so what matters is that it shows the prompt that was
 * actually sent, the money, and the failure text — and that it never dresses a
 * missing figure up as a real one.
 */
const detail = (over: Partial<OpenAiLogDetail> = {}): OpenAiLogDetail => ({
  __typename: 'OpenAiUsageLog',
  id: 'log-1',
  task: 'pod.describe',
  task_label: 'Describe a pod',
  module: 'Pods',
  detail: 'DUN-POD-4821',
  model: 'gpt-4o-mini',
  status: 'SUCCESS',
  http_status: 200,
  prompt_tokens: 900,
  completion_tokens: 351,
  total_tokens: 1251,
  cost_usd: 0.0004,
  priced: true,
  duration_ms: 1420,
  error_message: '',
  created_at: '2026-09-01T10:04:00.000Z',
  request_preview: 'Write a short description for a badminton pod in HSR.',
  response_preview: 'A friendly evening game of badminton in HSR Layout.',
  user_id: 'u-1',
  ...over,
} as OpenAiLogDetail);

const logMock = (over: Partial<OpenAiLogDetail> = {}, id = 'log-1'): MockedResponse => ({
  request: { query: OPENAI_LOG_ONE, variables: { id } },
  result: { data: { openAiUsageLog: detail({ ...over, id } as Partial<OpenAiLogDetail>) } },
  maxUsageCount: 5,
});

describe('OpenAiLogDrawer', () => {
  it('asks for nothing while it is closed', () => {
    renderWithProviders(<OpenAiLogDrawer logId={null} onClose={vi.fn()} />);

    // `skip` on the query — a closed drawer must not fetch every log in the table.
    expect(screen.queryByText('OpenAI call')).not.toBeInTheDocument();
  });

  it('shows the task, area, model and timing of the call', async () => {
    renderWithProviders(<OpenAiLogDrawer logId="log-1" onClose={vi.fn()} />, {
      mocks: [logMock()],
    });

    expect(await screen.findByText('Describe a pod (pod.describe)')).toBeInTheDocument();
    expect(screen.getByText('Pods')).toBeInTheDocument();
    expect(screen.getByText('DUN-POD-4821')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument();
    expect(screen.getByText('1420 ms')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
  });

  it('breaks the token count into what went in and what came back', async () => {
    renderWithProviders(<OpenAiLogDrawer logId="log-1" onClose={vi.fn()} />, {
      mocks: [logMock()],
    });

    expect(await screen.findByText(/900 in, 351 out/)).toBeInTheDocument();
  });

  it('says "unpriced model" rather than showing a cost it does not know', async () => {
    renderWithProviders(<OpenAiLogDrawer logId="log-1" onClose={vi.fn()} />, {
      mocks: [logMock({ priced: false, cost_usd: 0, total_tokens: 1251 })],
    });

    // A model with no rate card would otherwise read as free, which is the one
    // wrong answer a spend screen must not give.
    expect(await screen.findByText('unpriced model')).toBeInTheDocument();
  });

  it('still prices a call that used no tokens at all', async () => {
    renderWithProviders(<OpenAiLogDrawer logId="log-1" onClose={vi.fn()} />, {
      mocks: [logMock({ priced: false, cost_usd: 0, total_tokens: 0 })],
    });

    // Zero tokens genuinely cost zero, priced or not — that is a real figure.
    await waitFor(() => expect(screen.getByText('Describe a pod (pod.describe)')).toBeInTheDocument());
    expect(screen.queryByText('unpriced model')).not.toBeInTheDocument();
  });

  it('says a request was never sent instead of showing HTTP 0', async () => {
    renderWithProviders(<OpenAiLogDrawer logId="log-1" onClose={vi.fn()} />, {
      mocks: [logMock({ status: 'SKIPPED', http_status: 0 })],
    });

    expect(await screen.findByText('never sent')).toBeInTheDocument();
  });

  it('surfaces the failure message when the call did not succeed', async () => {
    renderWithProviders(<OpenAiLogDrawer logId="log-1" onClose={vi.fn()} />, {
      mocks: [logMock({ status: 'FAILED', error_message: 'rate limited (429)' })],
    });

    expect(await screen.findByText('rate limited (429)')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });

  it('shows the prompt that was sent and the answer that came back', async () => {
    renderWithProviders(<OpenAiLogDrawer logId="log-1" onClose={vi.fn()} />, {
      mocks: [logMock()],
    });

    expect(
      await screen.findByText('Write a short description for a badminton pod in HSR.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('A friendly evening game of badminton in HSR Layout.'),
    ).toBeInTheDocument();
  });

  it('falls back rather than leaving an empty block where a prompt should be', async () => {
    renderWithProviders(<OpenAiLogDrawer logId="log-1" onClose={vi.fn()} />, {
      mocks: [logMock({ module: '', detail: '', model: '', request_preview: '', response_preview: '' })],
    });

    await waitFor(() =>
      expect(screen.getByText('Describe a pod (pod.describe)')).toBeInTheDocument(),
    );
    expect(screen.getAllByText('—').length).toBeGreaterThan(2);
  });

  it('closes from the header button', async () => {
    const onClose = vi.fn();
    renderWithProviders(<OpenAiLogDrawer logId="log-1" onClose={onClose} />, {
      mocks: [logMock()],
    });

    await screen.findByText('Describe a pod (pod.describe)');
    fireEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
