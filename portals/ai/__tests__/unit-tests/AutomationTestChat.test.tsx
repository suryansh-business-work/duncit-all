import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { notifyError } from '@duncit/dialogs';
import TestChatPanel from '../../src/pages/automation/test-chat/TestChatPanel';
import { RESUME_TEST, START_TEST } from '../../src/pages/automation/queries';
import type { AutomationChannel, AutomationRun, RunMessage } from '../../src/pages/automation/types';
import { renderWithProviders } from '../testkit';
import { mutationOf, resetApollo } from './reel-apollo-mock';
import { en, node, run } from './automation-fixtures';

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('./reel-apollo-mock')).hooks,
}));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

const message = (over: Partial<RunMessage>): RunMessage => ({
  id: 'm1',
  direction: 'OUT',
  kind: 'text',
  text: 'Welcome aboard',
  subject: '',
  html: '',
  template_name: '',
  buttons: [],
  delivered: false,
  at: '2026-10-01T10:00:01.000Z',
  ...over,
});

const mount = (channel: AutomationChannel = 'WHATSAPP', extra: Partial<Parameters<typeof TestChatPanel>[0]> = {}) => {
  const onIssues = vi.fn();
  const onClose = vi.fn();
  renderWithProviders(
    <TestChatPanel flowId="F1" channel={channel} nodes={[node('trigger', 'trigger')]} edges={[]} onIssues={onIssues} onClose={onClose} {...extra} />
  );
  return { onIssues, onClose };
};

const fillContact = (name: string, phone: string) => {
  fireEvent.change(screen.getByTestId('automation-contact-name'), { target: { value: name } });
  fireEvent.change(screen.getByTestId('automation-contact-phone'), { target: { value: phone } });
};

const started = (over: Partial<AutomationRun> = {}) => ({ data: { startAutomationTest: run(over) } });

beforeEach(() => {
  resetApollo();
  localStorage.clear();
  vi.mocked(notifyError).mockClear();
});

describe('TestChatPanel', () => {
  it('starts a test with the canvas as drawn and shows the conversation', async () => {
    mutationOf(START_TEST).mockResolvedValue(
      started({
        status: 'WAITING_REPLY',
        messages: [
          message({ id: 'a', direction: 'IN', text: 'hi there' }),
          message({ id: 'b', buttons: ['Yes', 'No'], delivered: true }),
          message({ id: 'c', direction: 'SYSTEM', text: 'Engine note' }),
        ],
      })
    );
    const { onIssues } = mount();
    // Not valid yet: the number needs a country code and the name is blank.
    expect(screen.getByTestId('automation-contact-submit')).toBeDisabled();
    fillContact('Asha', '12');
    await screen.findByText(en('ai.automation.test.phoneInvalid'));
    fillContact('Asha', '+919999900000');
    fireEvent.change(screen.getByTestId('automation-contact-text'), { target: { value: 'hello' } });
    await waitFor(() => expect(screen.getByTestId('automation-contact-submit')).toBeEnabled());
    fireEvent.click(screen.getByTestId('automation-contact-submit'));

    expect(await screen.findByText('Welcome aboard')).toBeInTheDocument();
    const input = mutationOf(START_TEST).mock.calls[0][0]?.variables?.input as Record<string, unknown>;
    expect(input).toMatchObject({
      flow_id: 'F1',
      contact: { name: 'Asha', phone: '+919999900000', email: null },
      text: 'hello',
      deliver: false,
      edges: [],
    });
    expect(input.nodes).toEqual([{ id: 'trigger', kind: 'trigger', x: 0, y: 0, data: '{}' }]);
    expect(onIssues).toHaveBeenCalledWith([]);
    expect(screen.getByText('hi there')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('Engine note')).toBeInTheDocument();
    expect(screen.getByText(en('ai.automation.test.deliveredBadge'))).toBeInTheDocument();
    expect(screen.getByText(en('ai.automation.test.waiting'))).toBeInTheDocument();
    // The tester is remembered for next time.
    expect(JSON.parse(localStorage.getItem('ai_automation_test_contact') ?? '{}')).toMatchObject({ name: 'Asha', phone: '+919999900000' });
  });

  it('replies while the flow waits, and shows the finished state', async () => {
    mutationOf(START_TEST).mockResolvedValue(started({ status: 'WAITING_REPLY', messages: [message({})] }));
    mutationOf(RESUME_TEST).mockResolvedValue({
      data: { resumeAutomationTest: run({ status: 'COMPLETED', messages: [message({}), message({ id: 'r', direction: 'IN', text: 'Yes please' })] }) },
    });
    mount();
    fillContact('Asha', '+919999900000');
    await waitFor(() => expect(screen.getByTestId('automation-contact-submit')).toBeEnabled());
    fireEvent.click(screen.getByTestId('automation-contact-submit'));
    const composer = await screen.findByTestId('automation-test-composer');
    // An empty draft cannot be sent.
    expect(screen.getByRole('button', { name: en('ai.automation.test.send') })).toBeDisabled();
    fireEvent.change(composer, { target: { value: '  Yes please ' } });
    fireEvent.click(screen.getByRole('button', { name: en('ai.automation.test.send') }));

    expect(await screen.findByText(en('ai.automation.test.completed'))).toBeInTheDocument();
    expect(mutationOf(RESUME_TEST).mock.calls[0][0]?.variables).toEqual({ input: { run_id: 'R1', text: 'Yes please', timed_out: false } });
    expect(screen.queryByTestId('automation-test-composer')).not.toBeInTheDocument();
  });

  it('simulates a timeout, then starts over', async () => {
    mutationOf(START_TEST).mockResolvedValue(started({ status: 'WAITING_REPLY' }));
    mutationOf(RESUME_TEST).mockResolvedValue({ data: { resumeAutomationTest: run({ status: 'FAILED', error: 'No reply' }) } });
    mount();
    fillContact('Asha', '+919999900000');
    await waitFor(() => expect(screen.getByTestId('automation-contact-submit')).toBeEnabled());
    fireEvent.click(screen.getByTestId('automation-contact-submit'));
    fireEvent.click(await screen.findByRole('button', { name: en('ai.automation.test.simulateTimeout') }));
    expect(await screen.findByText(en('ai.automation.test.failed', { error: 'No reply' }))).toBeInTheDocument();
    expect(mutationOf(RESUME_TEST).mock.calls[0][0]?.variables).toEqual({ input: { run_id: 'R1', text: '', timed_out: true } });

    fireEvent.click(screen.getByTestId('automation-test-restart'));
    expect(await screen.findByTestId('automation-contact-form')).toBeInTheDocument();
  });

  it('marks the steps the server refused and says why when the test cannot start', async () => {
    mutationOf(START_TEST).mockRejectedValue({
      message: 'Flow is not runnable',
      errors: [{ message: 'Flow is not runnable', extensions: { issues: [{ node_id: 'n1', message: 'Pick a campaign' }] } }],
    });
    const { onIssues } = mount();
    fillContact('Asha', '+919999900000');
    await waitFor(() => expect(screen.getByTestId('automation-contact-submit')).toBeEnabled());
    fireEvent.click(screen.getByTestId('automation-contact-submit'));
    await waitFor(() => expect(onIssues).toHaveBeenCalledWith([{ node_id: 'n1', message: 'Pick a campaign' }]));
    expect(notifyError).toHaveBeenCalledTimes(1);
    // Still on the start form so the tester can fix and retry.
    expect(screen.getByTestId('automation-contact-form')).toBeInTheDocument();
  });

  it('tells the tester when a reply could not be delivered and keeps the conversation', async () => {
    mutationOf(START_TEST).mockResolvedValue(started({ status: 'WAITING_REPLY', messages: [message({})] }));
    mutationOf(RESUME_TEST).mockRejectedValue(new Error('Run already finished'));
    mount();
    fillContact('Asha', '+919999900000');
    await waitFor(() => expect(screen.getByTestId('automation-contact-submit')).toBeEnabled());
    fireEvent.click(screen.getByTestId('automation-contact-submit'));
    fireEvent.change(await screen.findByTestId('automation-test-composer'), { target: { value: 'hello?' } });
    fireEvent.click(screen.getByRole('button', { name: en('ai.automation.test.send') }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Run already finished'));
    expect(screen.getByText('Welcome aboard')).toBeInTheDocument();
  });

  it('asks an email flow for an address and notes AI steps', async () => {
    mutationOf(START_TEST).mockResolvedValue(started({ channel: 'EMAIL', status: 'CANCELLED' }));
    const { onClose } = mount('EMAIL', { nodes: [node('t', 'trigger'), node('a', 'ai_compose')] });
    expect(screen.getByText(en('ai.automation.test.aiNote'))).toBeInTheDocument();
    expect(screen.queryByTestId('automation-contact-phone')).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId('automation-contact-name'), { target: { value: 'Ravi' } });
    fireEvent.change(screen.getByTestId('automation-contact-email'), { target: { value: 'ravi@example.test' } });
    fireEvent.click(screen.getByTestId('automation-contact-deliver'));
    expect(screen.getByText(en('ai.automation.test.deliverHint'))).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('automation-contact-submit')).toBeEnabled());
    fireEvent.click(screen.getByTestId('automation-contact-submit'));
    expect(await screen.findByText(en('ai.automation.test.cancelled'))).toBeInTheDocument();
    expect(mutationOf(START_TEST).mock.calls[0][0]?.variables?.input).toMatchObject({
      contact: { name: 'Ravi', phone: null, email: 'ravi@example.test' },
      deliver: true,
    });
    fireEvent.click(screen.getByTestId('automation-test-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('opens an email message in a sandboxed preview', async () => {
    mutationOf(START_TEST).mockResolvedValue(
      started({
        channel: 'EMAIL',
        messages: [message({ kind: 'email', subject: 'Hello Ravi', html: '<p>Body</p>', text: '' })],
        steps: [
          { node_id: 'x', kind: 'send_email', status: 'OK', detail: 'sent', at: '2026-10-01T10:00:00.000Z' },
          { node_id: 'y', kind: 'legacy_kind', status: 'SKIPPED', detail: 'unknown', at: '2026-10-01T10:00:01.000Z' },
        ],
      })
    );
    mount('EMAIL');
    fireEvent.change(screen.getByTestId('automation-contact-name'), { target: { value: 'Ravi' } });
    fireEvent.change(screen.getByTestId('automation-contact-email'), { target: { value: 'ravi@example.test' } });
    await waitFor(() => expect(screen.getByTestId('automation-contact-submit')).toBeEnabled());
    fireEvent.click(screen.getByTestId('automation-contact-submit'));

    expect(await screen.findByText('Hello Ravi')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en('ai.automation.test.emailPreviewTitle') }));
    const dialog = await screen.findByRole('dialog');
    const frame = within(dialog).getByTitle('Hello Ravi');
    expect(frame).toHaveAttribute('sandbox', '');
    expect(frame).toHaveAttribute('srcdoc', '<p>Body</p>');

    // The step trace lists a known kind by its label and an unknown one verbatim.
    fireEvent.click(within(document.body).getByText(new RegExp(en('ai.automation.test.trace'))));
    expect(await screen.findByText('legacy_kind')).toBeInTheDocument();
    expect(screen.getByText(en('ai.automation.kinds.send_email'))).toBeInTheDocument();
  });
});
