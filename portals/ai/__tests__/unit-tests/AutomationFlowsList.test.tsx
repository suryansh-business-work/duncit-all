import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route } from 'react-router';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import AutomationFlowsPage from '../../src/pages/automation/flows-list';
import { AUTOMATION_FLOWS, DELETE_FLOW, DUPLICATE_FLOW, SAVE_FLOW } from '../../src/pages/automation/queries';
import type { AutomationFlow } from '../../src/pages/automation/types';
import { renderWithProviders } from '../testkit';
import { answerQuery, mutationOf, queryOptions, resetApollo, setMutationBusy } from './reel-apollo-mock';
import { en, flow } from './automation-fixtures';

const confirm = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('./reel-apollo-mock')).hooks,
}));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  useConfirm: () => confirm,
}));

interface ActionOptions {
  onEdit: (row: AutomationFlow) => void;
  onDelete: (row: AutomationFlow) => void;
  renderExtra: (row: AutomationFlow) => ReactNode;
  edit: { ariaLabel: (row: AutomationFlow) => string };
}

vi.mock('@duncit/table', async () => ({
  ...(await import('./table-mock')),
  dateColumn: (options: object) => options,
  actionsColumn: ({ onEdit, onDelete, renderExtra, edit }: ActionOptions) => ({
    field: 'actions',
    cellRenderer: (row: AutomationFlow): ReactNode => (
      <>
        <button type="button" aria-label={edit.ariaLabel(row)} data-testid={`open-${row.id}`} onClick={(event) => { event.stopPropagation(); onEdit(row); }} />
        <button type="button" data-testid={`delete-${row.id}`} onClick={(event) => { event.stopPropagation(); onDelete(row); }} />
        {renderExtra(row)}
      </>
    ),
  }),
}));

const FLOWS = [
  flow({ id: 'F1', name: 'Welcome flow', description: 'Greets new people', status: 'ACTIVE' }),
  flow({ id: 'F2', name: 'Win-back', description: '', status: 'PAUSED', trigger: 'MANUAL' }),
  flow({ id: 'F3', name: 'Legacy', description: '', trigger: 'SOMETHING_OLD' }),
];

const mount = (path = '/automation/whatsapp') =>
  renderWithProviders(<AutomationFlowsPage />, {
    initialEntries: [path],
    routes: (
      <>
        <Route path="/automation/:channel" element={<AutomationFlowsPage />} />
        <Route path="/automation/:channel/:flowId" element={<div data-testid="builder-route" />} />
        <Route path="/" element={<div data-testid="home-route" />} />
      </>
    ),
  });

const rows = () => screen.findAllByTestId('table-row');

beforeEach(() => {
  resetApollo();
  confirm.mockReset();
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
});

describe('Automation flows list', () => {
  it('lists the channel flows with status, trigger and run count', async () => {
    answerQuery(AUTOMATION_FLOWS, { data: { automationFlows: FLOWS } });
    mount();
    const [first, second, third] = await rows();
    expect(queryOptions.get(AUTOMATION_FLOWS)?.variables).toEqual({ channel: 'WHATSAPP' });
    expect(first).toHaveTextContent('Welcome flow');
    expect(first).toHaveTextContent('Greets new people');
    expect(first.querySelector('[data-testid="cell-status"]')).toHaveTextContent(en('ai.automation.status.ACTIVE'));
    expect(first.querySelector('[data-testid="cell-trigger"]')).toHaveTextContent(en('ai.automation.trigger.INBOUND_MESSAGE'));
    expect(first.querySelector('[data-testid="cell-run_count"]')).toHaveTextContent('3');
    expect(second.querySelector('[data-testid="cell-trigger"]')).toHaveTextContent(en('ai.automation.trigger.MANUAL'));
    // A trigger the portal does not know reads as "no trigger" rather than a raw key.
    expect(third.querySelector('[data-testid="cell-trigger"]')).toHaveTextContent(en('ai.automation.trigger.none'));
    expect(screen.getByRole('heading', { name: en('ai.automation.list.titleWhatsapp') })).toBeInTheDocument();
  });

  it('searches by name, description and trigger', async () => {
    answerQuery(AUTOMATION_FLOWS, { data: { automationFlows: FLOWS } });
    mount();
    await rows();
    fireEvent.change(screen.getByLabelText('table-search'), { target: { value: 'greets' } });
    await waitFor(async () => expect(await rows()).toHaveLength(1));
    expect((await rows())[0]).toHaveTextContent('Welcome flow');
  });

  it('shows the email titles, the empty state and a failed read', async () => {
    answerQuery(AUTOMATION_FLOWS, { data: { automationFlows: [] } });
    const first = mount('/automation/email');
    expect(await screen.findByTestId('table-empty')).toHaveTextContent(en('ai.automation.list.empty'));
    expect(screen.getByRole('heading', { name: en('ai.automation.list.titleEmail') })).toBeInTheDocument();
    expect(queryOptions.get(AUTOMATION_FLOWS)?.variables).toEqual({ channel: 'EMAIL' });
    first.unmount();

    answerQuery(AUTOMATION_FLOWS, { error: new Error('Flows unavailable') });
    mount();
    expect(screen.getByText('Flows unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('duncit-table')).not.toBeInTheDocument();
  });

  it('sends an unknown channel home', () => {
    mount('/automation/sms');
    expect(screen.getByTestId('home-route')).toBeInTheDocument();
  });

  it('opens a flow in the builder from its row', async () => {
    answerQuery(AUTOMATION_FLOWS, { data: { automationFlows: FLOWS } });
    mount();
    fireEvent.click(await screen.findByTestId('open-F2'));
    expect(await screen.findByTestId('builder-route')).toBeInTheDocument();
  });

  it('duplicates a flow and refreshes the list', async () => {
    const refetch = answerQuery(AUTOMATION_FLOWS, { data: { automationFlows: FLOWS } });
    mount();
    fireEvent.click((await screen.findAllByRole('button', { name: en('ai.automation.list.duplicate') }))[0]);
    await waitFor(() => expect(mutationOf(DUPLICATE_FLOW)).toHaveBeenCalledWith({ variables: { id: 'F1' } }));
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    expect(notifySuccess).toHaveBeenCalledWith(en('ai.automation.list.duplicated'));
  });

  it('reports a duplicate that failed and does not refresh', async () => {
    const refetch = answerQuery(AUTOMATION_FLOWS, { data: { automationFlows: FLOWS } });
    mutationOf(DUPLICATE_FLOW).mockRejectedValue(new Error('Too many flows'));
    mount();
    fireEvent.click((await screen.findAllByRole('button', { name: en('ai.automation.list.duplicate') }))[0]);
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Too many flows'));
    expect(refetch).not.toHaveBeenCalled();
  });

  it('deletes only after the operator confirms', async () => {
    const refetch = answerQuery(AUTOMATION_FLOWS, { data: { automationFlows: FLOWS } });
    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mount();
    fireEvent.click(await screen.findByTestId('delete-F1'));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(confirm.mock.calls[0][0]).toMatchObject({
      title: en('ai.automation.list.deleteTitle'),
      message: en('ai.automation.list.deleteMessage', { name: 'Welcome flow' }),
      destructive: true,
    });
    expect(mutationOf(DELETE_FLOW)).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByTestId('delete-F1'));
    await waitFor(() => expect(mutationOf(DELETE_FLOW)).toHaveBeenCalledWith({ variables: { id: 'F1' } }));
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    expect(notifySuccess).toHaveBeenCalledWith(en('ai.automation.list.deleted'));
  });

  it('reports a delete that failed', async () => {
    answerQuery(AUTOMATION_FLOWS, { data: { automationFlows: FLOWS } });
    confirm.mockResolvedValue(true);
    mutationOf(DELETE_FLOW).mockRejectedValue(new Error('Flow is running'));
    mount();
    fireEvent.click(await screen.findByTestId('delete-F1'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Flow is running'));
  });
});

describe('New flow dialog', () => {
  it('creates a flow with just its trigger and opens the builder', async () => {
    answerQuery(AUTOMATION_FLOWS, { data: { automationFlows: [] } });
    mutationOf(SAVE_FLOW).mockResolvedValue({ data: { saveAutomationFlow: flow({ id: 'NEW' }) } });
    mount();
    fireEvent.click(screen.getByTestId('automation-new-flow'));
    const submit = await screen.findByTestId('automation-flow-submit');
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByTestId('automation-flow-name'), { target: { value: '  Onboarding  ' } });
    fireEvent.change(screen.getByTestId('automation-flow-description'), { target: { value: 'Day one' } });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);

    expect(await screen.findByTestId('builder-route')).toBeInTheDocument();
    const input = mutationOf(SAVE_FLOW).mock.calls[0][0]?.variables?.input as { name: string; nodes: { data: string }[] };
    expect(input).toMatchObject({ name: 'Onboarding', description: 'Day one', channel: 'WHATSAPP', edges: [] });
    expect(JSON.parse(input.nodes[0].data)).toMatchObject({ trigger: 'INBOUND_MESSAGE' });
    expect(notifySuccess).toHaveBeenCalledWith(en('ai.automation.form.created'));
  });

  it('rejects an over-long name and stays closed-able; a failed save keeps the dialog', async () => {
    answerQuery(AUTOMATION_FLOWS, { data: { automationFlows: [] } });
    mutationOf(SAVE_FLOW).mockRejectedValue(new Error('Name already taken'));
    mount();
    fireEvent.click(screen.getByTestId('automation-new-flow'));
    const name = await screen.findByTestId('automation-flow-name');
    fireEvent.change(name, { target: { value: 'x'.repeat(81) } });
    expect(await screen.findByText(en('ai.automation.form.nameMax'))).toBeInTheDocument();
    expect(screen.getByTestId('automation-flow-submit')).toBeDisabled();

    fireEvent.change(name, { target: { value: 'Welcome flow' } });
    await waitFor(() => expect(screen.getByTestId('automation-flow-submit')).toBeEnabled());
    fireEvent.click(screen.getByTestId('automation-flow-submit'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Name already taken'));
    expect(screen.getByTestId('automation-flow-form')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('automation-flow-cancel'));
    await waitFor(() => expect(screen.queryByTestId('automation-flow-form')).not.toBeInTheDocument());
  });

  it('blocks a second submit while the first save is in flight', async () => {
    answerQuery(AUTOMATION_FLOWS, { data: { automationFlows: [] } });
    setMutationBusy(SAVE_FLOW, true);
    mount();
    fireEvent.click(screen.getByTestId('automation-new-flow'));
    fireEvent.change(await screen.findByTestId('automation-flow-name'), { target: { value: 'Busy' } });
    await waitFor(() => expect(screen.getByTestId('automation-flow-name')).toHaveValue('Busy'));
    expect(screen.getByTestId('automation-flow-submit')).toBeDisabled();
  });
});

describe('Automation flows list — waiting and naming', () => {
  it('waits for the first read before drawing the table', () => {
    answerQuery(AUTOMATION_FLOWS, { loading: true });
    mount();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('duncit-table')).not.toBeInTheDocument();
  });

  it('names each row’s open action after its flow, for a screen reader', async () => {
    answerQuery(AUTOMATION_FLOWS, { data: { automationFlows: FLOWS } });
    mount();
    expect(await screen.findByTestId('open-F2')).toHaveAccessibleName(en('ai.automation.list.actionsFor', { name: 'Win-back' }));
  });
});
