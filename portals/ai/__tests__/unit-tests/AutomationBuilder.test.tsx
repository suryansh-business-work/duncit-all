import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import AutomationBuilderPage from '../../src/pages/automation/builder';
import {
  AUTOMATION_FLOW,
  AUTOMATION_OPTIONS,
  AUTOMATION_RUNS,
  SAVE_FLOW,
  SET_FLOW_STATUS,
} from '../../src/pages/automation/queries';
import { renderWithProviders } from '../testkit';
import { answerQuery, mutationOf, resetApollo, setMutationBusy } from './reel-apollo-mock';
import { OPTIONS, en, flow } from './automation-fixtures';

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('./reel-apollo-mock')).hooks,
}));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

const mount = (path = '/automation/whatsapp/F1') =>
  renderWithProviders(<AutomationBuilderPage />, {
    initialEntries: [path],
    routes: (
      <>
        <Route path="/automation/:channel/:flowId" element={<AutomationBuilderPage />} />
        <Route path="/automation/:channel" element={<div data-testid="list-route" />} />
        <Route path="/" element={<div data-testid="home-route" />} />
      </>
    ),
  });

const load = (over: Parameters<typeof flow>[0] = {}) => {
  answerQuery(AUTOMATION_FLOW, { data: { automationFlow: flow(over) } });
  answerQuery(AUTOMATION_OPTIONS, { data: { automationOptions: OPTIONS } });
};

const nameField = () => screen.getByTestId('automation-flow-name-field') as HTMLInputElement;

beforeEach(() => {
  resetApollo();
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
});

describe('Automation builder — loading', () => {
  it('draws the saved steps and names the flow', async () => {
    load();
    mount();
    expect(await screen.findByTestId('automation-builder')).toBeInTheDocument();
    expect(nameField()).toHaveValue('Welcome flow');
    expect(await screen.findByTestId('automation-node-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('automation-node-delay')).toHaveTextContent('2');
    expect(screen.getByTestId('automation-issues')).toHaveTextContent(en('ai.automation.builder.noIssues'));
    expect(screen.getByTestId('automation-toggle-active')).toHaveTextContent(en('ai.automation.builder.activate'));
    expect(screen.queryByText(en('ai.automation.builder.unsaved'))).not.toBeInTheDocument();
  });

  it('counts the issues the server reported and marks the step', async () => {
    load({ issues: [{ node_id: 'n1', message: 'Delay is too long' }] });
    mount();
    const card = await screen.findByTestId('automation-node-delay');
    expect(within(card).getByLabelText('Delay is too long')).toBeInTheDocument();
    expect(screen.getByTestId('automation-issues')).toHaveTextContent(en('ai.automation.builder.issues', { count: 1 }));
  });

  it('says so when the flow does not exist, and bounces unknown routes', async () => {
    answerQuery(AUTOMATION_FLOW, { data: { automationFlow: null } });
    answerQuery(AUTOMATION_OPTIONS, { data: { automationOptions: OPTIONS } });
    const first = mount();
    expect(await screen.findByText(en('ai.automation.builder.notFound'))).toBeInTheDocument();
    first.unmount();

    mount('/automation/sms/F1');
    expect(screen.getByTestId('home-route')).toBeInTheDocument();
  });

  it('reports a flow that could not be read', () => {
    answerQuery(AUTOMATION_FLOW, { error: new Error('Flow read failed') });
    answerQuery(AUTOMATION_OPTIONS, { data: { automationOptions: OPTIONS } });
    mount();
    expect(screen.getByText('Flow read failed')).toBeInTheDocument();
    expect(screen.queryByTestId('automation-builder')).not.toBeInTheDocument();
  });

  it('goes back to the list', async () => {
    load();
    mount();
    fireEvent.click(await screen.findByTestId('automation-back'));
    expect(await screen.findByTestId('list-route')).toBeInTheDocument();
  });
});

describe('Automation builder — editing and saving', () => {
  it('marks unsaved work, saves the graph as drawn and clears the mark', async () => {
    load();
    mount();
    await screen.findByTestId('automation-builder');
    fireEvent.click(screen.getByTestId('automation-palette-send_whatsapp'));
    expect(await screen.findByText(en('ai.automation.builder.unsaved'))).toBeInTheDocument();
    expect(screen.getByTestId('automation-node-send_whatsapp')).toBeInTheDocument();
    // A dirty flow cannot be activated or run until it is saved.
    expect(screen.getByTestId('automation-toggle-active')).toBeDisabled();
    expect(screen.getByTestId('automation-run-now')).toBeDisabled();

    fireEvent.change(nameField(), { target: { value: 'Renamed' } });
    mutationOf(SAVE_FLOW).mockResolvedValue({ data: { saveAutomationFlow: flow({ name: 'Renamed' }) } });
    fireEvent.click(screen.getByTestId('automation-save'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith(en('ai.automation.builder.saved')));
    const input = mutationOf(SAVE_FLOW).mock.calls[0][0]?.variables?.input as { id: string; name: string; nodes: { kind: string }[]; edges: unknown[] };
    expect(input).toMatchObject({ id: 'F1', name: 'Renamed', channel: 'WHATSAPP' });
    expect(input.nodes.map((n) => n.kind)).toEqual(['trigger', 'delay', 'send_whatsapp']);
    expect(input.edges).toHaveLength(1);
    await waitFor(() => expect(screen.queryByText(en('ai.automation.builder.unsaved'))).not.toBeInTheDocument());
  });

  it('refuses to save a blank name', async () => {
    load();
    mount();
    await screen.findByTestId('automation-builder');
    fireEvent.change(nameField(), { target: { value: '   ' } });
    expect(screen.getByTestId('automation-save')).toBeDisabled();
    expect(screen.getByText(en('ai.automation.builder.nameRequired'))).toBeInTheDocument();
  });

  it('reports a failed save and keeps the work', async () => {
    load();
    mutationOf(SAVE_FLOW).mockRejectedValue(new Error('Server busy'));
    mount();
    await screen.findByTestId('automation-builder');
    fireEvent.click(screen.getByTestId('automation-palette-delay'));
    fireEvent.click(screen.getByTestId('automation-save'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Server busy'));
    expect(screen.getByText(en('ai.automation.builder.unsaved'))).toBeInTheDocument();
  });

  it('asks the browser to confirm leaving with unsaved work', async () => {
    load();
    mount();
    await screen.findByTestId('automation-builder');
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);

    fireEvent.click(screen.getByTestId('automation-palette-delay'));
    const dirty = new Event('beforeunload', { cancelable: true });
    await waitFor(() => {
      window.dispatchEvent(dirty);
      expect(dirty.defaultPrevented).toBe(true);
    });
  });
});

describe('Automation builder — activation, panels and canvas', () => {
  it('activates a clean flow and shows the new state', async () => {
    load();
    mutationOf(SET_FLOW_STATUS).mockResolvedValue({ data: { setAutomationFlowStatus: flow({ status: 'ACTIVE' }) } });
    mount();
    await screen.findByTestId('automation-builder');
    fireEvent.click(screen.getByTestId('automation-toggle-active'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith(en('ai.automation.builder.activated')));
    expect(mutationOf(SET_FLOW_STATUS)).toHaveBeenCalledWith({ variables: { id: 'F1', status: 'ACTIVE' } });
    await waitFor(() => expect(screen.getByTestId('automation-toggle-active')).toHaveTextContent(en('ai.automation.builder.pause')));
  });

  it('paints the issues when activation is refused', async () => {
    load();
    mutationOf(SET_FLOW_STATUS).mockRejectedValue({
      message: 'Fix the flow first',
      errors: [{ message: 'Fix the flow first', extensions: { issues: [{ node_id: 'n1', message: 'No amount' }] } }],
    });
    mount();
    await screen.findByTestId('automation-builder');
    fireEvent.click(screen.getByTestId('automation-toggle-active'));
    await waitFor(() => expect(screen.getByTestId('automation-issues')).toHaveTextContent(en('ai.automation.builder.issues', { count: 1 })));
    expect(notifyError).toHaveBeenCalledWith('Fix the flow first');
    // React Flow repaints the node a tick after the toolbar count updates.
    expect(await within(screen.getByTestId('automation-node-delay')).findByLabelText('No amount')).toBeInTheDocument();
  });

  it('switches the side panel between inspector, test chat and runs', async () => {
    load();
    answerQuery(AUTOMATION_RUNS, { data: { automationRuns: [] } });
    mount();
    await screen.findByTestId('automation-builder');
    fireEvent.click(screen.getByTestId('automation-test-toggle'));
    expect(await screen.findByTestId('automation-test-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('automation-test-close'));
    expect(screen.queryByTestId('automation-test-panel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('automation-runs-toggle'));
    expect(await screen.findByTestId('automation-runs-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('automation-runs-toggle'));
    expect(screen.queryByTestId('automation-runs-panel')).not.toBeInTheDocument();
  });

  it('opens the run-now dialog and lands on the runs panel when a run starts', async () => {
    load();
    answerQuery(AUTOMATION_RUNS, { data: { automationRuns: [] } });
    mount();
    await screen.findByTestId('automation-builder');
    fireEvent.click(screen.getByTestId('automation-run-now'));
    fireEvent.change(await screen.findByTestId('automation-contact-name'), { target: { value: 'Asha' } });
    fireEvent.change(screen.getByTestId('automation-contact-phone'), { target: { value: '+919999900000' } });
    await waitFor(() => expect(screen.getByTestId('automation-contact-submit')).toBeEnabled());
    fireEvent.click(screen.getByTestId('automation-contact-submit'));
    expect(await screen.findByTestId('automation-runs-panel')).toBeInTheDocument();
  });

  it('selects a step on click and shows its settings, then drops it on pane click', async () => {
    load();
    mount();
    fireEvent.click(await screen.findByTestId('automation-node-delay'));
    expect(await screen.findByTestId('automation-inspector')).toBeInTheDocument();
    expect(screen.getByLabelText(en('ai.automation.inspector.delay.amount'))).toHaveValue(2);
    fireEvent.click(screen.getByTestId('automation-inspector-delete'));
    await waitFor(() => expect(screen.queryByTestId('automation-node-delay')).not.toBeInTheDocument());
    expect(screen.getByText(en('ai.automation.builder.unsaved'))).toBeInTheDocument();
  });

  it('drives the zoom and full-screen controls from the keyboard-reachable buttons', async () => {
    load();
    mount();
    await screen.findByTestId('automation-canvas');
    fireEvent.click(screen.getByTestId('automation-canvas-in'));
    fireEvent.click(screen.getByTestId('automation-canvas-out'));
    fireEvent.click(screen.getByTestId('automation-canvas-fit'));
    fireEvent.click(screen.getByTestId('automation-canvas-full'));
    expect(screen.getByTestId('automation-canvas-full')).toHaveAccessibleName(en('ai.automation.builder.exitFullScreen'));
    fireEvent.click(screen.getByTestId('automation-canvas-full'));
    expect(screen.getByTestId('automation-canvas-full')).toHaveAccessibleName(en('ai.automation.builder.fullScreen'));
  });
});

describe('Automation builder — waiting, pausing and quiet answers', () => {
  it('waits on the flow, then on the options, before drawing anything', () => {
    answerQuery(AUTOMATION_FLOW, { loading: true });
    answerQuery(AUTOMATION_OPTIONS, { data: { automationOptions: OPTIONS } });
    const first = mount();
    expect(screen.getByTestId('loader')).toHaveAttribute('role', 'status');
    expect(screen.queryByTestId('automation-builder')).not.toBeInTheDocument();
    first.unmount();

    answerQuery(AUTOMATION_FLOW, { data: { automationFlow: flow() } });
    answerQuery(AUTOMATION_OPTIONS, { loading: true });
    mount();
    expect(screen.getByTestId('loader')).toHaveAttribute('role', 'status');
    expect(screen.queryByTestId('automation-builder')).not.toBeInTheDocument();
  });

  it('keeps the builder drawn while both queries refetch over data it already has', async () => {
    answerQuery(AUTOMATION_FLOW, { data: { automationFlow: flow() }, loading: true });
    answerQuery(AUTOMATION_OPTIONS, { data: { automationOptions: OPTIONS }, loading: true });
    mount();
    expect(await screen.findByTestId('automation-builder')).toBeInTheDocument();
    expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    expect(nameField()).toHaveValue('Welcome flow');
  });

  it('reports options that could not be read', () => {
    answerQuery(AUTOMATION_FLOW, { data: { automationFlow: flow() } });
    answerQuery(AUTOMATION_OPTIONS, { error: new Error('Options read failed') });
    mount();
    expect(screen.getByText('Options read failed')).toBeInTheDocument();
    expect(screen.queryByTestId('automation-builder')).not.toBeInTheDocument();
  });

  it('pauses a live flow', async () => {
    load({ status: 'ACTIVE' });
    mutationOf(SET_FLOW_STATUS).mockResolvedValue({ data: { setAutomationFlowStatus: flow({ status: 'PAUSED' }) } });
    mount();
    const toggle = await screen.findByTestId('automation-toggle-active');
    expect(toggle).toHaveTextContent(en('ai.automation.builder.pause'));
    fireEvent.click(toggle);
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith(en('ai.automation.builder.paused')));
    expect(mutationOf(SET_FLOW_STATUS)).toHaveBeenCalledWith({ variables: { id: 'F1', status: 'PAUSED' } });
    await waitFor(() => expect(screen.getByTestId('automation-toggle-active')).toHaveTextContent(en('ai.automation.builder.activate')));
  });

  it('claims nothing when a save comes back without the flow', async () => {
    load();
    mutationOf(SAVE_FLOW).mockResolvedValue({ data: {} });
    mount();
    await screen.findByTestId('automation-builder');
    fireEvent.click(screen.getByTestId('automation-palette-delay'));
    fireEvent.click(screen.getByTestId('automation-save'));
    await waitFor(() => expect(mutationOf(SAVE_FLOW)).toHaveBeenCalledTimes(1));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(notifyError).not.toHaveBeenCalled();
    // The work is still unsaved, because nothing confirmed it was.
    expect(screen.getByText(en('ai.automation.builder.unsaved'))).toBeInTheDocument();
  });

  it('shows a save in flight and holds the button', async () => {
    load();
    setMutationBusy(SAVE_FLOW, true);
    mount();
    const saveButton = await screen.findByTestId('automation-save');
    expect(saveButton).toHaveTextContent(en('ai.automation.builder.saving'));
    expect(saveButton).toBeDisabled();
  });

  it('closes the test chat from its own toolbar toggle', async () => {
    load();
    mount();
    await screen.findByTestId('automation-builder');
    const toggle = screen.getByTestId('automation-test-toggle');
    fireEvent.click(toggle);
    expect(await screen.findByTestId('automation-test-panel')).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    expect(screen.queryByTestId('automation-test-panel')).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });
});
