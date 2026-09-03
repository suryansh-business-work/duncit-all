import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { useRef } from 'react';
import OpenAiLogsTable from '../../src/pages/openai-logs/OpenAiLogsTable';
import type { OpenAiLogRow } from '../../src/pages/openai-logs/queries';
import { renderWithProviders } from '../testkit';

vi.mock('@duncit/table', () => import('./table-mock'));

/**
 * The OpenAI usage table.
 *
 * This is a spend screen, so the column that matters most is cost: the amounts
 * span six orders of magnitude, and a model with no rate card must not read as
 * free. The rest is about a call still being legible when half its fields are
 * empty, which is what a skipped or failed call looks like.
 */
const row = (over: Partial<OpenAiLogRow> = {}): OpenAiLogRow => ({
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
  ...over,
});

function Harness({
  rows,
  onRowClick = vi.fn(),
}: Readonly<{ rows: OpenAiLogRow[]; onRowClick?: (row: OpenAiLogRow) => void }>) {
  const refetchRef = useRef<(() => void) | null>(null);
  const fetchRows = async () => ({ rows, total: rows.length });
  return (
    <OpenAiLogsTable
      fetchRows={fetchRows as never}
      refetchRef={refetchRef}
      onRowClick={onRowClick}
      taskOptions={[{ value: 'pod.describe', label: 'Describe a pod' }]}
      moduleOptions={[{ value: 'Pods', label: 'Pods' }]}
    />
  );
}

const mount = (rows: OpenAiLogRow[], onRowClick?: (row: OpenAiLogRow) => void) =>
  renderWithProviders(<Harness rows={rows} onRowClick={onRowClick} />);

describe('OpenAiLogsTable', () => {
  it('names the task and the thing it was called for', async () => {
    mount([row()]);

    expect(await screen.findByText('Describe a pod')).toBeInTheDocument();
    expect(screen.getByText('DUN-POD-4821')).toBeInTheDocument();
  });

  it('falls back to the task key and the area when the labels are missing', async () => {
    mount([row({ task_label: '', detail: '' })]);

    // A task added server-side has no label on an older client; the row must
    // still say which call it was.
    expect(await screen.findByText('pod.describe')).toBeInTheDocument();
    // Twice on purpose: the module column, plus the task column falling back
    // to the area when there is no detail to show.
    expect(screen.getAllByText('Pods')).toHaveLength(2);
  });

  it('prices a sub-cent call at a precision that does not round it to zero', async () => {
    mount([row({ cost_usd: 0.0004 })]);

    // Two decimals would print every moderation scan as "$0.00".
    expect(await screen.findByText('$0.000400')).toBeInTheDocument();
  });

  it('says a model is unpriced rather than showing it as free', async () => {
    mount([row({ priced: false, cost_usd: 0, total_tokens: 1251 })]);

    // The tokens were spent; the rate card just cannot say what they were
    // worth. "$0" would be the one wrong answer here.
    expect(await screen.findByText('unpriced')).toBeInTheDocument();
  });

  it('still shows a real zero for a call that used no tokens', async () => {
    mount([row({ priced: false, cost_usd: 0, total_tokens: 0 })]);

    expect(await screen.findByText('$0')).toBeInTheDocument();
    expect(screen.queryByText('unpriced')).not.toBeInTheDocument();
  });

  it('breaks the token count into what went in and what came back', async () => {
    mount([row()]);

    expect(await screen.findByText('1,251')).toBeInTheDocument();
    expect(screen.getByText('900 in · 351 out')).toBeInTheDocument();
  });

  it('leaves the error column quiet on a success', async () => {
    mount([row()]);

    expect(await screen.findByText('—')).toBeInTheDocument();
  });

  it('shows the whole failure message when there is one', async () => {
    mount([row({ status: 'FAILED', error_message: 'rate limited (429)' })]);

    expect(await screen.findByText('rate limited (429)')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });

  it('dashes the area and the model when the call recorded neither', async () => {
    mount([row({ module: '', model: '', detail: '', task_label: '' })]);

    // A skipped call never reached a model, and an ad-hoc call has no area —
    // both columns have to read as absent rather than empty.
    await screen.findByText('pod.describe');
    expect(screen.getAllByText('—').length).toBeGreaterThan(1);
  });

  it('opens the row it was clicked on', async () => {
    const onRowClick = vi.fn();
    mount([row()], onRowClick);

    fireEvent.click(await screen.findByTestId('table-row'));
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'log-1' }));
  });
});
