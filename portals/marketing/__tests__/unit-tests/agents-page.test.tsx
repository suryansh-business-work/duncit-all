import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { Route } from 'react-router';
import { renderWithProviders } from '../testkit';
import {
  makeAccountDoctor,
  makeAgent,
  makeCommunityWatch,
  marketingAgentsErrorMock,
  marketingAgentsMock,
  runMarketingAgentErrorMock,
  runMarketingAgentMock,
  updateMarketingAgentErrorMock,
  updateMarketingAgentMock,
} from '../mocks';

const userCtx = vi.hoisted(() => ({ roles: ['MARKETING_MANAGER'] as string[] }));
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => ({ user: { user_id: 'u1', roles: userCtx.roles } }),
}));
const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${String(d)}` }),
}));

import AgentsPage from '../../src/pages/agents-page';

/** What the guide kit remembers for u1 once the Agents tour has been shown. */
const TOUR_SEEN = ['duncit.tours.completed.u1', '["marketing.agents"]'] as const;
const ALL = [makeAgent(), makeCommunityWatch(), makeAccountDoctor()];

beforeEach(() => {
  userCtx.roles = ['MARKETING_MANAGER'];
  localStorage.setItem(...TOUR_SEEN);
});

afterEach(() => {
  vi.clearAllMocks();
});

const renderPage = (mocks: MockedResponse[]) =>
  renderWithProviders(<AgentsPage />, {
    mocks,
    initialEntries: ['/automation/agents'],
    routes: (
      <>
        <Route path="/automation/agents" element={<AgentsPage />} />
        <Route path="/activity" element={<div>activity-page</div>} />
      </>
    ),
  });

describe('AgentsPage', () => {
  it('opens with its heading, waits for the list, then shows one card per agent with the intro', async () => {
    renderPage([marketingAgentsMock(ALL)]);
    expect(screen.getByRole('heading', { level: 1, name: 'Agents' })).toBeInTheDocument();
    expect(screen.getByText('Switch on, schedule and configure the agents that plan with Claude and act through code.')).toBeInTheDocument();
    expect(screen.getByTestId('agents-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('page-intro')).not.toBeInTheDocument();

    expect(await screen.findByTestId('agent-card-CONTENT_PLANNER')).toBeInTheDocument();
    expect(screen.queryByTestId('agents-loading')).not.toBeInTheDocument();
    const intro = screen.getByTestId('page-intro');
    expect(within(intro).getByText(/Agents plan with Claude and act through the same tools you use/)).toBeInTheDocument();
    expect(within(intro).getByText('Switch an agent on and pick when it runs. Nothing runs until it is on.')).toBeInTheDocument();
    expect(screen.getByText('Content planner')).toBeInTheDocument();
    expect(screen.getByText('Community watch')).toBeInTheDocument();
    expect(screen.getByText('Account doctor')).toBeInTheDocument();
    expect(screen.getByText(/Each day, runs the AI review over new comments/)).toBeInTheDocument();
    // Only the planner writes anything, so only it carries the approval note.
    expect(screen.getAllByTestId('agent-approval-note')).toHaveLength(1);
    expect(within(screen.getByTestId('agent-card-CONTENT_PLANNER')).getByTestId('agent-approval-note')).toHaveTextContent(
      'Everything this agent writes waits on Approvals; nothing goes out until a manager says yes.',
    );
    // Nothing is on yet, and the page says so above the cards.
    expect(screen.getByTestId('agents-none-enabled')).toHaveTextContent('No agent is switched on yet');
    expect(screen.queryByTestId('agents-read-only')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('agent-run-now')).toHaveLength(3);
    expect(screen.getAllByRole('checkbox', { name: /Switch .* on or off/ })).toHaveLength(3);
  });

  it('falls back to the server’s own words for an agent it has no copy for', async () => {
    renderPage([marketingAgentsMock([makeAgent({ key: 'LEAD_HUNTER' as never, name: 'Lead hunter', description: 'Finds leads.', enabled: true })])]);
    expect(await screen.findByText('Lead hunter')).toBeInTheDocument();
    expect(screen.getByText('Finds leads.')).toBeInTheDocument();
    expect(screen.queryByTestId('agents-none-enabled')).not.toBeInTheDocument();
  });

  it('shows the empty state when the server lists no agents', async () => {
    renderPage([marketingAgentsMock([])]);
    expect(await screen.findByTestId('agents-empty')).toHaveTextContent('No agents yet');
    expect(screen.queryByTestId('agents-none-enabled')).not.toBeInTheDocument();
  });

  it('shows the failure and reads again on Try again', async () => {
    renderPage([marketingAgentsErrorMock('agents are down'), marketingAgentsMock(ALL)]);
    const alert = await screen.findByTestId('agents-error');
    expect(alert).toHaveTextContent('agents are down');
    expect(screen.queryByTestId('agents-empty')).not.toBeInTheDocument();
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('agent-card-ACCOUNT_DOCTOR')).toBeInTheDocument();
    expect(screen.queryByTestId('agents-error')).not.toBeInTheDocument();
  });

  it('lets an editor read every card but switch, save or run nothing', async () => {
    userCtx.roles = ['MARKETING_EDITOR'];
    renderPage([marketingAgentsMock([makeAgent({ enabled: true }), makeAccountDoctor()])]);
    expect(await screen.findByTestId('agents-read-only')).toHaveTextContent('You can read the agents but not change or run them; ask a marketing manager.');
    expect(screen.queryByRole('checkbox', { name: /Switch .* on or off/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('agent-state-CONTENT_PLANNER')).toHaveTextContent('On');
    expect(screen.getByTestId('agent-state-ACCOUNT_DOCTOR')).toHaveTextContent('Off');
    expect(screen.queryByTestId('agent-run-now')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Brief/)).toBeDisabled();
  });

  it('switches an agent on, says so, and reads the list again', async () => {
    const on = makeAccountDoctor({ enabled: true, next_run_at: '2026-11-03T01:30:00.000Z' });
    renderPage([
      marketingAgentsMock([makeAccountDoctor()]),
      updateMarketingAgentMock('ACCOUNT_DOCTOR', { enabled: true }, on),
      marketingAgentsMock([on]),
    ]);
    const toggle = await screen.findByTestId('agent-switch-ACCOUNT_DOCTOR');
    expect(within(toggle).getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByTestId('agents-none-enabled')).toBeInTheDocument();
    fireEvent.click(within(toggle).getByRole('checkbox'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Agent saved.', 'success'));
    await waitFor(() => expect(within(screen.getByTestId('agent-switch-ACCOUNT_DOCTOR')).getByRole('checkbox')).toBeChecked());
    expect(screen.queryByTestId('agents-none-enabled')).not.toBeInTheDocument();
    expect(screen.getByTestId('agent-next-run')).toHaveTextContent('fmt:2026-11-03T01:30:00.000Z');
  });

  it('reports a save the server refused', async () => {
    renderPage([marketingAgentsMock([makeAccountDoctor()]), updateMarketingAgentErrorMock('ACCOUNT_DOCTOR', { enabled: true }, 'The schedule is not valid')]);
    fireEvent.click(within(await screen.findByTestId('agent-switch-ACCOUNT_DOCTOR')).getByRole('checkbox'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('The schedule is not valid', 'error'));
    expect(within(screen.getByTestId('agent-switch-ACCOUNT_DOCTOR')).getByRole('checkbox')).not.toBeChecked();
  });

  it('saves the form through the same mutation, schedule and params together for the planner', async () => {
    const saved = makeAgent({ schedule: { every: 'WEEK', hour: 9, weekday: 1 }, params: { brief: 'Pets', networks: [], posts_per_week: 3 } });
    renderPage([
      marketingAgentsMock([makeAgent()]),
      updateMarketingAgentMock(
        'CONTENT_PLANNER',
        { schedule: { every: 'WEEK', hour: 9, weekday: 1 }, params: { brief: 'Pets', networks: [], posts_per_week: 3 } },
        saved,
      ),
      marketingAgentsMock([saved]),
    ]);
    fireEvent.change(await screen.findByLabelText(/^Brief/), { target: { value: 'Pets' } });
    const save = screen.getByRole('button', { name: 'Save' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Agent saved.', 'success'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled());
  });

  it('runs an agent now, says where to follow it, and reads the list again', async () => {
    const ran = makeCommunityWatch({ last_run_id: 'run-1', last_run_status: 'RUNNING', last_run_at: '2026-11-02T02:30:00.000Z' });
    renderPage([marketingAgentsMock([makeCommunityWatch()]), runMarketingAgentMock('COMMUNITY_WATCH', 'run-1'), marketingAgentsMock([ran])]);
    fireEvent.click(await screen.findByTestId('agent-run-now'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('The run has started. Follow it on Activity.', 'success'));
    expect(await screen.findByTestId('agent-open-last-run')).toHaveAttribute('href', '/activity?workflow=AGENT');
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('reports a run the server refused', async () => {
    renderPage([marketingAgentsMock([makeCommunityWatch()]), runMarketingAgentErrorMock('COMMUNITY_WATCH', 'Access Denied')]);
    fireEvent.click(await screen.findByTestId('agent-run-now'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Access Denied', 'error'));
    expect(screen.queryByTestId('agent-open-last-run')).not.toBeInTheDocument();
  });

  it('walks a first-time manager through the switch, the schedule and Run now, then remembers', async () => {
    localStorage.clear();
    renderPage([marketingAgentsMock(ALL)]);
    const card = await screen.findByRole('dialog', { name: 'The switch' });
    expect(card).toHaveAccessibleDescription('Nothing runs until an agent is on. Off keeps its settings and stops the orchestrator from picking it up.');
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog', { name: 'When, and with what' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog', { name: 'Try it, then follow it' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByTestId('portal-tour')).not.toBeInTheDocument();
    expect(localStorage.getItem(TOUR_SEEN[0])).toBe(TOUR_SEEN[1]);
  });

  it('starts the tour again from the intro for someone who has seen it', async () => {
    renderPage([marketingAgentsMock(ALL)]);
    await screen.findByTestId('agent-card-CONTENT_PLANNER');
    expect(screen.queryByTestId('portal-tour')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start tour' }));
    expect(screen.getByRole('dialog', { name: 'The switch' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Skip tour' }));
    expect(screen.queryByTestId('portal-tour')).not.toBeInTheDocument();
  });
});
