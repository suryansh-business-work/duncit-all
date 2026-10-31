import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Route } from 'react-router';
import { renderWithProviders } from '../testkit';
import { makeAccountDoctor, makeAgent } from '../mocks';

vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${String(d)}` }),
}));

import AgentRunStatus from '../../src/pages/agents-page/AgentRunStatus';

const renderStatus = (ui: ReactElement) =>
  renderWithProviders(ui, {
    initialEntries: ['/automation/agents'],
    routes: (
      <>
        <Route path="/automation/agents" element={ui} />
        <Route path="/activity" element={<div>activity-page</div>} />
      </>
    ),
  });

describe('AgentRunStatus', () => {
  it('says an agent has never run and is not booked, with nothing to open or press', () => {
    renderStatus(<AgentRunStatus agent={makeAgent()} busy={false} />);
    expect(screen.getByTestId('agent-last-run-never')).toHaveTextContent('Never run');
    expect(screen.getByTestId('agent-next-run')).toHaveTextContent('Not scheduled — switch the agent on');
    expect(screen.queryByTestId('agent-last-run-at')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agent-open-last-run')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agent-run-now')).not.toBeInTheDocument();
    // The two help tips explain the last run and the next one.
    expect(screen.getAllByRole('button', { name: 'More about this' })).toHaveLength(2);
  });

  it('shows how the last run ended, when, a way to open it on Activity, and the next booked time', () => {
    const agent = makeAccountDoctor({
      enabled: true,
      last_run_at: '2026-11-02T01:30:00.000Z',
      last_run_id: 'run-7',
      last_run_status: 'PARTIAL',
      next_run_at: '2026-11-03T01:30:00.000Z',
    });
    renderStatus(<AgentRunStatus agent={agent} busy={false} />);
    expect(screen.getByText('Partly done')).toBeInTheDocument();
    expect(screen.getByTestId('agent-last-run-at')).toHaveTextContent('fmt:2026-11-02T01:30:00.000Z');
    expect(screen.getByTestId('agent-next-run')).toHaveTextContent('fmt:2026-11-03T01:30:00.000Z');
    const link = screen.getByTestId('agent-open-last-run');
    expect(link).toHaveAttribute('href', '/activity?workflow=AGENT');
    fireEvent.click(link);
    expect(screen.getByText('activity-page')).toBeInTheDocument();
  });

  it('keeps a booked time hidden while the agent is off', () => {
    renderStatus(<AgentRunStatus agent={makeAgent({ enabled: false, next_run_at: '2026-11-03T01:30:00.000Z' })} busy={false} />);
    expect(screen.getByTestId('agent-next-run')).toHaveTextContent('Not scheduled — switch the agent on');
  });

  it('offers Run now to a manager, and waits while something is in flight', () => {
    const onRun = vi.fn();
    const { rerender } = renderStatus(<AgentRunStatus agent={makeAgent()} busy={false} onRun={onRun} />);
    fireEvent.click(screen.getByTestId('agent-run-now'));
    expect(onRun).toHaveBeenCalledTimes(1);
    rerender(<AgentRunStatus agent={makeAgent()} busy onRun={onRun} />);
    expect(screen.getByTestId('agent-run-now')).toBeDisabled();
  });
});
