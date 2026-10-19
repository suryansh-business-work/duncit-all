import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import RunsPanel from '../../src/pages/automation/runs/RunsPanel';
import RunContactDialog from '../../src/pages/automation/builder/RunContactDialog';
import { AUTOMATION_RUNS, CANCEL_RUN, START_RUN } from '../../src/pages/automation/queries';
import { renderWithProviders } from '../testkit';
import { answerQuery, mutationOf, resetApollo } from './reel-apollo-mock';
import { en, run } from './automation-fixtures';

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('./reel-apollo-mock')).hooks,
}));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

const RUNS = [
  run({ id: 'R1', status: 'WAITING_REPLY', mode: 'LIVE', contact: { name: 'Asha', phone: '+910000000001', email: '' } }),
  run({ id: 'R2', status: 'FAILED', error: 'Template rejected', contact: { name: 'Ravi', phone: '', email: 'ravi@example.test' } }),
];

beforeEach(() => {
  resetApollo();
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
});

describe('RunsPanel', () => {
  it('lists runs with their mode, status and contact, newest as given', () => {
    answerQuery(AUTOMATION_RUNS, { data: { automationRuns: RUNS } });
    renderWithProviders(<RunsPanel flowId="F1" onClose={vi.fn()} />);
    const asha = screen.getByRole('button', { name: en('ai.automation.runs.openRun', { id: 'Asha' }) });
    expect(within(asha).getByText(en('ai.automation.runs.modes.LIVE'))).toBeInTheDocument();
    expect(within(asha).getByText(en('ai.automation.runs.statuses.WAITING_REPLY'))).toBeInTheDocument();
    expect(asha).toHaveTextContent('+910000000001');
    expect(screen.getByRole('button', { name: en('ai.automation.runs.openRun', { id: 'Ravi' }) })).toHaveTextContent('ravi@example.test');
  });

  it('shows the empty state, a loading read and a failed read', () => {
    answerQuery(AUTOMATION_RUNS, { data: { automationRuns: [] } });
    const first = renderWithProviders(<RunsPanel flowId="F1" onClose={vi.fn()} />);
    expect(screen.getByText(en('ai.automation.runs.empty'))).toBeInTheDocument();
    first.unmount();

    answerQuery(AUTOMATION_RUNS, { error: new Error('Runs unavailable') });
    renderWithProviders(<RunsPanel flowId="F1" onClose={vi.fn()} />);
    expect(screen.getByText('Runs unavailable')).toBeInTheDocument();
    expect(screen.queryByText(en('ai.automation.runs.empty'))).not.toBeInTheDocument();
  });

  it('opens a run in full and cancels it while it is still open', async () => {
    answerQuery(AUTOMATION_RUNS, { data: { automationRuns: RUNS } });
    renderWithProviders(<RunsPanel flowId="F1" onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: en('ai.automation.runs.openRun', { id: 'Asha' }) }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(en('ai.automation.test.waiting'))).toBeInTheDocument();
    fireEvent.click(within(dialog).getByTestId('automation-run-cancel'));
    await waitFor(() => expect(mutationOf(CANCEL_RUN)).toHaveBeenCalledWith({ variables: { id: 'R1' } }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith(en('ai.automation.runs.cancelled')));
  });

  it('reports a cancel the server refused', async () => {
    answerQuery(AUTOMATION_RUNS, { data: { automationRuns: RUNS } });
    mutationOf(CANCEL_RUN).mockRejectedValue(new Error('Already finished'));
    renderWithProviders(<RunsPanel flowId="F1" onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: en('ai.automation.runs.openRun', { id: 'Asha' }) }));
    fireEvent.click(await screen.findByTestId('automation-run-cancel'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Already finished'));
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('offers no cancel for a finished run, and closing returns to the list', async () => {
    answerQuery(AUTOMATION_RUNS, { data: { automationRuns: RUNS } });
    const onClose = vi.fn();
    renderWithProviders(<RunsPanel flowId="F1" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: en('ai.automation.runs.openRun', { id: 'Ravi' }) }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(en('ai.automation.test.failed', { error: 'Template rejected' }))).toBeInTheDocument();
    expect(within(dialog).queryByTestId('automation-run-cancel')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1) as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    expect(onClose).toHaveBeenCalled();
  });
});

describe('RunContactDialog', () => {
  const mount = (channel: 'WHATSAPP' | 'EMAIL') => {
    const onClose = vi.fn();
    const onStarted = vi.fn();
    renderWithProviders(<RunContactDialog open flowId="F1" channel={channel} onClose={onClose} onStarted={onStarted} />);
    return { onClose, onStarted };
  };

  it('starts a live run for one WhatsApp contact', async () => {
    const { onClose, onStarted } = mount('WHATSAPP');
    expect(screen.getByText(en('ai.automation.builder.runNowHint'))).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('automation-contact-name'), { target: { value: 'Asha' } });
    fireEvent.change(screen.getByTestId('automation-contact-phone'), { target: { value: '+919999900000' } });
    await waitFor(() => expect(screen.getByTestId('automation-contact-submit')).toBeEnabled());
    fireEvent.click(screen.getByTestId('automation-contact-submit'));
    await waitFor(() => expect(onStarted).toHaveBeenCalled());
    expect(mutationOf(START_RUN)).toHaveBeenCalledWith({
      variables: { flow_id: 'F1', contact: { name: 'Asha', phone: '+919999900000', email: null }, text: '' },
    });
    expect(onClose).toHaveBeenCalled();
    expect(notifySuccess).toHaveBeenCalledWith(en('ai.automation.builder.runStarted'));
  });

  it('keeps the dialog open and says so when the run could not start', async () => {
    mutationOf(START_RUN).mockRejectedValue(new Error('WhatsApp is not connected'));
    const { onClose, onStarted } = mount('EMAIL');
    fireEvent.change(screen.getByTestId('automation-contact-name'), { target: { value: 'Ravi' } });
    fireEvent.change(screen.getByTestId('automation-contact-email'), { target: { value: 'ravi@example.test' } });
    await waitFor(() => expect(screen.getByTestId('automation-contact-submit')).toBeEnabled());
    fireEvent.click(screen.getByTestId('automation-contact-submit'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('WhatsApp is not connected'));
    expect(mutationOf(START_RUN).mock.calls[0][0]?.variables).toMatchObject({ contact: { phone: null, email: 'ravi@example.test' } });
    expect(onStarted).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('RunsPanel — first read', () => {
  it('shows a spinner, not the empty state, until the runs arrive', () => {
    answerQuery(AUTOMATION_RUNS, { loading: true });
    renderWithProviders(<RunsPanel flowId="F1" onClose={vi.fn()} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText(en('ai.automation.runs.empty'))).not.toBeInTheDocument();
  });
});
