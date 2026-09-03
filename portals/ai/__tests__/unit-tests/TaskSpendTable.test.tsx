import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import TaskSpendTable from '../../src/pages/openai-dashboard/TaskSpendTable';
import type { TaskSpend } from '../../src/pages/openai-dashboard/queries';
import { renderWithProviders } from '../testkit';

vi.mock('@duncit/table', () => import('./table-mock'));

/**
 * Per-task spend — the answer to "which feature is the bill".
 *
 * The failures column is the one that earns its place: a failure still costs
 * money when the model answered and the answer was unusable, and costs nothing
 * when the key was missing, so it is what explains a task whose spend does not
 * match its call count.
 */
const spend = (over: Partial<TaskSpend> = {}): TaskSpend => ({
  task: 'pod.describe',
  label: 'Describe a pod',
  module: 'Pods',
  calls: 412,
  tokens: 515_000,
  cost_usd: 1.24,
  failures: 0,
  avg_duration_ms: 1420,
  ...over,
});

describe('TaskSpendTable', () => {
  it('names each task by its label and its key', async () => {
    renderWithProviders(<TaskSpendTable rows={[spend()]} />);

    expect(await screen.findByText('Describe a pod')).toBeInTheDocument();
    // The key is what someone greps the codebase for.
    expect(screen.getByText('pod.describe')).toBeInTheDocument();
  });

  it('shows the area, call count and spend for the range', async () => {
    renderWithProviders(<TaskSpendTable rows={[spend()]} />);

    expect(await screen.findByText('Pods')).toBeInTheDocument();
    expect(screen.getByText('$1.24')).toBeInTheDocument();
  });

  it('leaves the failures column quiet when a task never failed', async () => {
    renderWithProviders(<TaskSpendTable rows={[spend({ failures: 0 })]} />);

    // A zero chip on every healthy row is noise; the column only speaks when
    // there is something to explain.
    expect(await screen.findByText('—')).toBeInTheDocument();
  });

  it('calls out the failures when a task has them', async () => {
    renderWithProviders(<TaskSpendTable rows={[spend({ failures: 7 })]} />);

    expect(await screen.findByText('7')).toBeInTheDocument();
  });

  it('prices a sub-cent task without rounding it to zero', async () => {
    renderWithProviders(<TaskSpendTable rows={[spend({ cost_usd: 0.0004 })]} />);

    expect(await screen.findByText('$0.000400')).toBeInTheDocument();
  });

  it('renders every task it is given', async () => {
    renderWithProviders(
      <TaskSpendTable
        rows={[spend(), spend({ task: 'club.suggest', label: 'Suggest a club', module: 'Clubs' })]}
      />,
    );

    expect(await screen.findAllByTestId('table-row')).toHaveLength(2);
    expect(screen.getByText('Suggest a club')).toBeInTheDocument();
  });

  it('searches a task by its label, its area or its key', async () => {
    renderWithProviders(
      <TaskSpendTable
        rows={[spend(), spend({ task: 'club.suggest', label: 'Suggest a club', module: 'Clubs' })]}
      />,
    );
    expect(await screen.findAllByTestId('table-row')).toHaveLength(2);

    // The key is searchable too — it is what someone reads off a log line and
    // pastes in here.
    fireEvent.change(screen.getByLabelText('table-search'), { target: { value: 'club.sug' } });

    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(1));
    expect(screen.getByText('Suggest a club')).toBeInTheDocument();
  });

  it('says so when the range has no spend at all', () => {
    renderWithProviders(<TaskSpendTable rows={[]} />);

    // It answers in its own words rather than mounting an empty grid, which
    // would show a header row over nothing.
    expect(screen.getByText('No OpenAI calls in this range.')).toBeInTheDocument();
    expect(screen.queryByTestId('duncit-table')).not.toBeInTheDocument();
  });
});
