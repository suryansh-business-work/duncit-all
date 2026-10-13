import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { notify } from '@duncit/dialogs';
import MailAutomationPage from '../../src/pages/mail-automation';
import { slaLabel } from '../../src/pages/mail-automation/mail-automation-rule';
import { renderWithProviders } from '../testkit';
import {
  mailboxesErrorMock,
  mailboxesMock,
  mailPreviewErrorMock,
  mailPreviewMock,
  mailThreadsMock,
  makeMailThread,
  makeMailbox,
  updateMailRuleMock,
} from '../mocks';

vi.mock(import('@duncit/dialogs'), async (importOriginal) => ({
  ...(await importOriginal()),
  notify: vi.fn(),
}));

/**
 * Support's side of Mail Automation: the mailboxes Tech connected, the rule
 * behind each one, and the record of what each has answered. Connecting and
 * disconnecting is not here, on purpose.
 */
const HELP = makeMailbox();
const PAUSED = makeMailbox({
  id: 'ma-2',
  email: 'legal@duncit.com',
  is_active: false,
  ai_enabled: true,
  ticket_type: 'GRIEVANCE',
  sla_label: '12 hours',
  sla_min_hours: 12,
  sla_max_hours: 12,
  reply_template: 'We have your complaint {{ticket_no}}.',
});
const LOST = makeMailbox({
  id: 'ma-3',
  email: 'press@duncit.com',
  is_connected: false,
  ticket_type: 'REPORT_PROBLEM',
});

const renderPage = (mocks: MockedResponse[] = []) =>
  renderWithProviders(<MailAutomationPage />, {
    // Specific mocks first: the first matching mock wins.
    mocks: [...mocks, mailboxesMock([HELP, PAUSED, LOST]), mailThreadsMock([], 'ma-1'), mailThreadsMock([], 'ma-2')],
  });

const rowOf = async (email: string) => {
  const cell = await screen.findByText(email);
  return cell.closest('[role="row"]') as HTMLElement;
};

const configure = async (email: string) => {
  const row = await rowOf(email);
  fireEvent.click(within(row).getByRole('button', { name: 'Configure' }));
  return screen.findByRole('dialog');
};

const messageBox = () => screen.getByRole('textbox', { name: 'What every first message gets back' });
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));

beforeEach(() => {
  vi.mocked(notify).mockClear();
});

describe('MailAutomationPage — the mailboxes', () => {
  it('shows a spinner until the mailboxes arrive', async () => {
    renderPage();
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
    expect(await screen.findByText('help@duncit.com')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows each mailbox with its state, queue, promise and who writes the reply', async () => {
    renderPage();
    const help = await rowOf('help@duncit.com');
    expect(within(help).getByText('Automation running')).toBeInTheDocument();
    expect(within(help).getByText('Support ticket')).toBeInTheDocument();
    expect(within(help).getByText('24-48 hours')).toBeInTheDocument();
    expect(within(help).getByText('Your message, as written')).toBeInTheDocument();

    const paused = await rowOf('legal@duncit.com');
    expect(within(paused).getByText(/Automation paused/)).toBeInTheDocument();
    expect(within(paused).getByText('Grievance ticket')).toBeInTheDocument();
    expect(within(paused).getByText('Written by AI from your message')).toBeInTheDocument();

    const lost = await rowOf('press@duncit.com');
    expect(within(lost).getByText(/lost its Google grant/)).toBeInTheDocument();
    expect(within(lost).getByText('Report a problem')).toBeInTheDocument();
  });

  it('narrows the mailboxes by what is typed in the search box', async () => {
    renderPage();
    await rowOf('help@duncit.com');
    fireEvent.change(screen.getByPlaceholderText('Search mailbox'), { target: { value: 'legal' } });

    await waitFor(() => expect(screen.queryByText('help@duncit.com')).not.toBeInTheDocument());
    expect(screen.getByText('legal@duncit.com')).toBeInTheDocument();
    expect(screen.queryByText('press@duncit.com')).not.toBeInTheDocument();
  });

  it('says so when no mailbox is connected', async () => {
    renderWithProviders(<MailAutomationPage />, { mocks: [mailboxesMock([])] });
    expect(
      await screen.findByText(
        'No mailbox is connected yet. Ask Tech to connect one under Tech → Mail Automation.',
      ),
    ).toBeInTheDocument();
  });

  it("shows the server's reason when the mailboxes cannot be read", async () => {
    renderWithProviders(<MailAutomationPage />, { mocks: [mailboxesErrorMock('Mail service is down')] });
    expect(await screen.findByText('Mail service is down')).toBeInTheDocument();
  });
});

describe('MailAutomationPage — the rule dialog', () => {
  it('opens on the mailbox step with the address, the pause switch and the thread rule', async () => {
    renderPage();
    const dialog = await configure('help@duncit.com');

    expect(within(dialog).getByText('Rule for help@duncit.com')).toBeInTheDocument();
    expect(within(dialog).getAllByText('help@duncit.com').length).toBeGreaterThan(0);
    expect(within(dialog).getByText(/Only the FIRST message of a conversation/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/lost its Google grant/)).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Back' })).toBeDisabled();
  });

  it('warns on the mailbox step when Google access is gone and shows the paused wording', async () => {
    renderPage([mailThreadsMock([], 'ma-3')]);
    const dialog = await configure('press@duncit.com');
    expect(within(dialog).getByText(/lost its Google grant/)).toBeInTheDocument();

    const toggle = within(dialog).getByRole('switch');
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(within(dialog).getByText(/Automation paused/)).toBeInTheDocument();
  });

  it('lists what the mailbox has answered, including a failed and a pending acknowledgement', async () => {
    renderPage([
      mailThreadsMock(
        [
          makeMailThread(),
          makeMailThread({
            id: 'th-2',
            from_name: '',
            from_email: 'raj@example.com',
            subject: 'Where is my order',
            ticket_no: '',
            replied_at: null,
            reply_error: 'Mailbox quota exceeded',
            reply_by_ai: true,
          }),
          makeMailThread({ id: 'th-3', subject: 'Hello?', replied_at: null, reply_error: '' }),
        ],
        'ma-1',
      ),
    ]);
    const dialog = await configure('help@duncit.com');
    expect(await screen.findByText('Recently answered')).toBeInTheDocument();

    expect(await screen.findByText('Refund for my pod')).toBeInTheDocument();
    expect(screen.getAllByText('TKT-000101').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Asha Rao').length).toBeGreaterThan(0);
    expect(screen.getByText(/^Replied /)).toBeInTheDocument();
    // A sender with no name falls back to the address; no ticket yet shows a dash.
    expect(screen.getAllByText('raj@example.com').length).toBeGreaterThan(0);
    expect(screen.getByText('Ticket opened, reply failed: Mailbox quota exceeded')).toBeInTheDocument();
    expect(screen.getByText('Picked up but not answered — it retries on the next check.')).toBeInTheDocument();
    expect(dialog).toBeInTheDocument();
  });

  it('shows a blank received time for a thread with no timestamp', async () => {
    renderPage([mailThreadsMock([makeMailThread({ created_at: '' })], 'ma-1')]);
    await configure('help@duncit.com');
    expect(await screen.findByText('Refund for my pod')).toBeInTheDocument();
  });

  it('narrows the answered threads by subject, sender or ticket', async () => {
    renderPage([
      mailThreadsMock(
        [makeMailThread(), makeMailThread({ id: 'th-2', subject: 'Where is my order', ticket_no: 'TKT-000102' })],
        'ma-1',
      ),
    ]);
    await configure('help@duncit.com');
    await screen.findByText('Refund for my pod');
    fireEvent.change(screen.getByPlaceholderText('Subject'), { target: { value: 'Where' } });

    await waitFor(() => expect(screen.queryByText('Refund for my pod')).not.toBeInTheDocument());
    expect(screen.getByText('Where is my order')).toBeInTheDocument();
  });

  it('says nothing has been answered yet', async () => {
    renderPage();
    await configure('help@duncit.com');
    expect(await screen.findByText('Nothing answered yet.')).toBeInTheDocument();
  });

  it('closes on the Close button', async () => {
    renderPage();
    const dialog = await configure('help@duncit.com');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText('Recently answered')).not.toBeInTheDocument();
  });

  it('is not thrown away by Escape or a click on the backdrop', async () => {
    renderPage();
    const dialog = await configure('help@duncit.com');

    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    const backdrop = document.querySelector('.MuiBackdrop-root') as HTMLElement;
    fireEvent.click(backdrop);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('MailAutomationPage — writing the reply', () => {
  const toMessageStep = async (email = 'help@duncit.com') => {
    const dialog = await configure(email);
    next();
    await screen.findByRole('textbox', { name: 'What every first message gets back' });
    return dialog;
  };

  it('seeds the message from the saved rule and lists the placeholders', async () => {
    renderPage();
    const dialog = await toMessageStep();

    expect(messageBox()).toHaveValue('Thanks for writing. Your reference is {{ticket_no}}.');
    for (const token of ['{{ticket_no}}', '{{sender_name}}', '{{sla}}', '{{subject}}', '{{mailbox}}']) {
      expect(within(dialog).getAllByText(token).length).toBeGreaterThan(0);
    }
    expect(within(dialog).getByText('Let AI write the actual reply')).toBeInTheDocument();
  });

  it('will not leave the step with an empty message', async () => {
    renderPage();
    await toMessageStep();
    fireEvent.change(messageBox(), { target: { value: '   ' } });
    next();

    expect(await screen.findByText('Write the reply message')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('will not leave the step without the ticket reference placeholder', async () => {
    renderPage();
    await toMessageStep();
    fireEvent.change(messageBox(), { target: { value: 'Thanks for writing to us.' } });
    next();

    expect(
      await screen.findByText('Include {{ticket_no}} so the sender gets their reference'),
    ).toBeInTheDocument();
  });

  it('previews the reply from the draft with numeric hours and says who wrote it', async () => {
    renderPage([
      mailPreviewMock({ text: 'Hello Asha, we got your note.', by_ai: true }, (variables) => {
        const input = variables.input as Record<string, unknown>;
        return (
          input.id === 'ma-1' &&
          input.reply_template === 'Thanks. Ref {{ticket_no}}.' &&
          input.sla_min_hours === 24 &&
          input.sla_max_hours === 48
        );
      }),
    ]);
    await toMessageStep();
    fireEvent.change(messageBox(), { target: { value: 'Thanks. Ref {{ticket_no}}.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview the reply' }));

    expect(await screen.findByText('Hello Asha, we got your note.')).toBeInTheDocument();
    expect(screen.getByText('What the sender receives')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Written by AI from your message');
  });

  it('shows a template preview as the message exactly as written', async () => {
    renderPage([mailPreviewMock({ text: 'Exactly as written', by_ai: false })]);
    await toMessageStep();
    fireEvent.click(screen.getByRole('button', { name: 'Preview the reply' }));

    expect(await screen.findByText('Exactly as written')).toBeInTheDocument();
    expect(screen.getAllByText('Your message, as written').length).toBeGreaterThan(0);
  });

  it('does not ask the server for a preview of an empty message', async () => {
    renderPage();
    await toMessageStep();
    fireEvent.change(messageBox(), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview the reply' }));

    expect(await screen.findByText('Write the reply message')).toBeInTheDocument();
    expect(notify).not.toHaveBeenCalled();
    expect(screen.queryByText('What the sender receives')).not.toBeInTheDocument();
  });

  it('tells the agent why a preview failed', async () => {
    renderPage([mailPreviewErrorMock('OpenAI is unavailable')]);
    await toMessageStep();
    fireEvent.click(screen.getByRole('button', { name: 'Preview the reply' }));

    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        'Could not build a preview: OpenAI is unavailable',
        'error',
      ),
    );
    expect(screen.queryByText('What the sender receives')).not.toBeInTheDocument();
  });

  it('lets the AI switch be turned on', async () => {
    renderPage();
    const dialog = await toMessageStep();
    const aiSwitch = within(dialog).getByRole('switch');
    expect(aiSwitch).not.toBeChecked();
    fireEvent.click(aiSwitch);
    expect(aiSwitch).toBeChecked();
  });
});

describe('MailAutomationPage — the queue and the promise', () => {
  const toTicketStep = async (email = 'help@duncit.com') => {
    const dialog = await configure(email);
    next();
    await screen.findByRole('textbox', { name: 'What every first message gets back' });
    next();
    await screen.findByRole('radio', { name: /Support ticket/ });
    return dialog;
  };

  it('offers the three queues with the saved one chosen and words the window', async () => {
    renderPage();
    const dialog = await toTicketStep();

    expect(within(dialog).getByRole('radio', { name: /Support ticket/ })).toBeChecked();
    expect(within(dialog).getByRole('radio', { name: /Grievance ticket/ })).not.toBeChecked();
    expect(within(dialog).getByRole('radio', { name: /Report a problem/ })).not.toBeChecked();
    expect(within(dialog).getByLabelText('Minimum hours')).toHaveValue(24);
    expect(within(dialog).getByLabelText('Maximum hours')).toHaveValue(48);
    expect(within(dialog).getByText(/Worded as “24-48 hours”/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('saves the rule with the chosen queue and numeric hours, then closes', async () => {
    renderPage([
      updateMailRuleMock((variables) => {
        const input = variables.input as Record<string, unknown>;
        return (
          input.id === 'ma-1' &&
          input.ticket_type === 'GRIEVANCE' &&
          input.sla_min_hours === 12 &&
          input.sla_max_hours === 36 &&
          input.is_active === true &&
          input.ai_enabled === false &&
          input.reply_template === 'Thanks for writing. Your reference is {{ticket_no}}.'
        );
      }),
    ]);
    const dialog = await toTicketStep();
    fireEvent.click(within(dialog).getByRole('radio', { name: /Grievance ticket/ }));
    fireEvent.change(within(dialog).getByLabelText('Minimum hours'), { target: { value: '12' } });
    fireEvent.change(within(dialog).getByLabelText('Maximum hours'), { target: { value: '36' } });
    expect(within(dialog).getByText(/Worded as “12-36 hours”/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(notify).toHaveBeenCalledWith('Rule saved', 'success'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('refuses a minimum above the maximum', async () => {
    renderPage();
    const dialog = await toTicketStep();
    fireEvent.change(within(dialog).getByLabelText('Minimum hours'), { target: { value: '60' } });
    fireEvent.change(within(dialog).getByLabelText('Maximum hours'), { target: { value: '30' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('Minimum cannot be more than maximum')).toBeInTheDocument();
    expect(notify).not.toHaveBeenCalled();
  });

  it('refuses hours outside 1 to 720', async () => {
    renderPage();
    const dialog = await toTicketStep();
    fireEvent.change(within(dialog).getByLabelText('Minimum hours'), { target: { value: '0' } });
    fireEvent.change(within(dialog).getByLabelText('Maximum hours'), { target: { value: '721' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect((await within(dialog).findAllByText('Between 1 and 720 hours')).length).toBe(2);
  });

  it("tells the agent the server's reason when the save fails and keeps the dialog open", async () => {
    renderPage([updateMailRuleMock(() => true, 'Mailbox was disconnected')]);
    const dialog = await toTicketStep();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith('Could not save: Mailbox was disconnected', 'error'),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('goes back a step from Back and from a completed step label, never forward from a label', async () => {
    renderPage();
    await toTicketStep();

    // A label ahead of the current step does nothing: forward goes through Next.
    fireEvent.click(screen.getByText('Ticket & action time'));
    expect(screen.getByRole('radio', { name: /Support ticket/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('textbox', { name: 'What every first message gets back' })).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('dialog')).getByText('Mailbox'));
    expect(await screen.findByText(/Only the FIRST message of a conversation/)).toBeInTheDocument();

    // Step 3 label while on step 1: ignored.
    fireEvent.click(screen.getByText('Ticket & action time'));
    expect(screen.getByText(/Only the FIRST message of a conversation/)).toBeInTheDocument();
  });

  it('never saves from a step before the last, even when the form is submitted', async () => {
    renderPage([updateMailRuleMock()]);
    const dialog = await configure('help@duncit.com');
    fireEvent.submit(dialog.querySelector('form') as HTMLFormElement);

    // Nothing was written and the wizard is still on step 1.
    expect(notify).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(dialog).getByText(/Only the FIRST message of a conversation/)).toBeInTheDocument();
  });

  it('loads the next mailbox its own rule rather than the previous one', async () => {
    renderPage();
    let dialog = await configure('help@duncit.com');
    next();
    await screen.findByRole('textbox', { name: 'What every first message gets back' });
    fireEvent.change(messageBox(), { target: { value: 'Draft for help {{ticket_no}}' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    dialog = await configure('legal@duncit.com');
    next();
    await screen.findByRole('textbox', { name: 'What every first message gets back' });
    expect(messageBox()).toHaveValue('We have your complaint {{ticket_no}}.');
    expect(within(dialog).getByText('Rule for legal@duncit.com')).toBeInTheDocument();
  });
});

describe('slaLabel', () => {
  it.each([
    [24, 48, '24-48 hours'],
    [48, 24, '24-48 hours'],
    [12, 12, '12 hours'],
    [1, 1, '1 hour'],
  ])('words %i to %i hours as "%s"', (min, max, expected) => {
    expect(slaLabel(min, max)).toBe(expected);
  });
});
