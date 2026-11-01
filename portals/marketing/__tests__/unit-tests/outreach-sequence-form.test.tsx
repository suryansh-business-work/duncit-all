import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import { draftStepErrorMock, draftStepMock, makeOutreachSequence, makeOutreachStep, makeWaTemplate } from '../mocks';

const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));

import SequenceForm from '../../src/pages/outreach-page/sequence-form';
import type { OutreachSequence, OutreachWaTemplate } from '../../src/pages/outreach-page/queries';

afterEach(() => {
  vi.clearAllMocks();
});

interface Setup {
  sequence?: OutreachSequence | null;
  templates?: OutreachWaTemplate[];
  readOnly?: boolean;
  mocks?: MockedResponse[];
}

const setup = ({ sequence = null, templates = [makeWaTemplate()], readOnly = false, mocks = [] }: Setup = {}) => {
  const onSubmit = vi.fn().mockResolvedValue(true);
  const onCancel = vi.fn();
  renderWithProviders(<SequenceForm sequence={sequence} templates={templates} busy={false} readOnly={readOnly} onSubmit={onSubmit} onCancel={onCancel} />, { mocks });
  return { onSubmit, onCancel };
};

const stepTitles = () => screen.getAllByTestId(/^step-\d+-title$/).map((title) => title.textContent);

describe('SequenceForm: the settings', () => {
  it('shows the pace, the quiet hours, stop on reply and the pipeline with Any first', () => {
    setup();
    expect(screen.getByRole('spinbutton', { name: 'Daily limit' })).toHaveValue(50);
    expect(screen.getByText('Sends and DM tasks a day, across the whole sequence.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Quiet from/ })).toHaveTextContent('21:00');
    expect(screen.getByRole('combobox', { name: /^Quiet until/ })).toHaveTextContent('09:00');
    expect(within(screen.getByTestId('sequence-stop-on-reply')).getByRole('switch')).toBeChecked();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /^Pipeline/ }));
    const options = within(screen.getByRole('listbox')).getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['Any pipeline', 'Venue', 'Host', 'Brand', 'Influencer', 'Advertiser', 'General']);
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Host' }));
    expect(screen.getByRole('combobox', { name: /^Pipeline/ })).toHaveTextContent('Host');
  });

  it('submits what the fields hold, stop on reply switched off and quiet hours moved', async () => {
    const { onSubmit } = setup();
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Venue intro' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Subject' }), { target: { value: 'Hi {name}' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Email text' }), { target: { value: 'Hello' } });
    fireEvent.click(within(screen.getByTestId('sequence-stop-on-reply')).getByRole('switch'));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /^Quiet from/ }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: '22:00' }));
    fireEvent.click(screen.getByTestId('sequence-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: 'Venue intro', stop_on_reply: false, quiet_start_hour: 22, quiet_end_hour: 9 });
  });

  it('refuses an empty form under each field and says nothing was sent', async () => {
    const { onSubmit, onCancel } = setup();
    fireEvent.click(screen.getByTestId('sequence-submit'));
    expect(await screen.findByText('Give the sequence a name.')).toBeInTheDocument();
    expect(screen.getByText('Write the subject.')).toBeInTheDocument();
    expect(screen.getByText('Write the message.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows everything and saves nothing when read-only', () => {
    setup({ sequence: makeOutreachSequence(), readOnly: true });
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeDisabled();
    expect(screen.queryByTestId('sequence-submit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('add-step-EMAIL')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove step 1' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('step-0-draft')).not.toBeInTheDocument();
  });
});

describe('SequenceForm: the steps', () => {
  it('explains the variables and adds one step of each kind, with that kind’s fields', () => {
    setup();
    expect(screen.getByTestId('sequence-variables')).toHaveTextContent('Write {name}, {company} in a subject, message or WhatsApp value');
    fireEvent.click(screen.getByRole('button', { name: 'Add WhatsApp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add DM task' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Wait' }));
    expect(stepTitles()).toEqual(['1. Email', '2. WhatsApp', '3. DM task', '4. Wait']);
    expect(within(screen.getByTestId('step-1')).getByRole('combobox', { name: /^WhatsApp template/ })).toBeInTheDocument();
    expect(within(screen.getByTestId('step-2')).getByRole('textbox', { name: 'DM to send' })).toBeInTheDocument();
    expect(within(screen.getByTestId('step-3')).getByRole('spinbutton', { name: 'Days to wait' })).toHaveValue(2);
    expect(within(screen.getByTestId('step-3')).queryByTestId('step-3-draft')).not.toBeInTheDocument();
  });

  it('moves a step up and down and removes one, never the last', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Remove step 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move step 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move step 1 down' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Add Wait' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move step 2 up' }));
    expect(stepTitles()).toEqual(['1. Wait', '2. Email']);
    fireEvent.click(screen.getByRole('button', { name: 'Move step 1 down' }));
    expect(stepTitles()).toEqual(['1. Email', '2. Wait']);
    fireEvent.click(screen.getByRole('button', { name: 'Remove step 2' }));
    expect(stepTitles()).toEqual(['1. Email']);
  });

  it('stops adding at twenty steps', () => {
    const twenty = makeOutreachSequence({ steps: Array.from({ length: 20 }, () => makeOutreachStep()) });
    setup({ sequence: twenty });
    for (const kind of ['EMAIL', 'WHATSAPP', 'DM_TASK', 'WAIT']) expect(screen.getByTestId(`add-step-${kind}`)).toBeDisabled();
  });

  it('shows a rule about the whole list under the steps', async () => {
    const waits = makeOutreachSequence({ steps: [makeOutreachStep({ kind: 'WAIT', wait_days: 2, subject: '', body: '' })] });
    setup({ sequence: waits });
    fireEvent.click(screen.getByTestId('sequence-submit'));
    expect(await screen.findByTestId('sequence-steps-error')).toHaveTextContent(/Add at least one step that reaches the lead\.|A sequence cannot end with a wait\./);
  });
});

describe('SequenceForm: WhatsApp', () => {
  const pending = makeWaTemplate({ key: 'pending_one', description: 'Waiting', status: 'PENDING', approved: false, body: '' });
  const blankStatus = makeWaTemplate({ key: 'unknown_one', status: '', approved: false, body: '' });

  it('lets only an approved template be picked, shows its text and how many values it takes', () => {
    setup({ templates: [makeWaTemplate(), pending, blankStatus] });
    fireEvent.click(screen.getByRole('button', { name: 'Add WhatsApp' }));
    const step = screen.getByTestId('step-1');
    expect(within(step).getByText('One value per line, in the template’s order.')).toBeInTheDocument();
    fireEvent.mouseDown(within(step).getByRole('combobox', { name: /^WhatsApp template/ }));
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByRole('option', { name: /pending_one/ })).toHaveAttribute('aria-disabled', 'true');
    expect(within(listbox).getByText('Not approved (PENDING)')).toBeInTheDocument();
    expect(within(listbox).getByText('Not approved (—)')).toBeInTheDocument();
    fireEvent.click(within(listbox).getByRole('option', { name: /venue_intro/ }));
    expect(screen.getByTestId('step-1-template-body')).toHaveTextContent('Hi {{1}}, Duncit here.');
    expect(within(step).getByText('This template takes 1 values, one per line.')).toBeInTheDocument();
  });

  it('warns when Communications has no templates for the picker', () => {
    setup({ templates: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Add WhatsApp' }));
    expect(screen.getByTestId('wa-templates-empty')).toHaveTextContent('No WhatsApp templates are available.');
  });

  it('refuses a saved step whose template is no longer approved', async () => {
    const sequence = makeOutreachSequence({ steps: [makeOutreachStep({ kind: 'WHATSAPP', subject: '', body: '', wa_template_key: 'pending_one', wa_params: ['x'] })] });
    const { onSubmit } = setup({ sequence, templates: [makeWaTemplate(), pending] });
    fireEvent.click(screen.getByTestId('sequence-submit'));
    expect(await screen.findByText('This template is not approved. Pick an approved one.')).toBeInTheDocument();
    expect(screen.queryByTestId('step-0-template-body')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('SequenceForm: drafting with AI', () => {
  it('waits for the sequence to be saved before it drafts', () => {
    setup();
    expect(screen.getByTestId('step-0-draft')).toBeDisabled();
    expect(screen.getByTestId('step-0-draft-hint')).toHaveTextContent('Save the sequence first to draft this step.');
  });

  it('waits for a step whose kind changed since the save', () => {
    const sequence = makeOutreachSequence({ steps: [makeOutreachStep()] });
    setup({ sequence });
    fireEvent.click(screen.getByRole('button', { name: 'Add DM task' }));
    expect(screen.getByTestId('step-0-draft')).toBeEnabled();
    expect(screen.getByTestId('step-1-draft')).toBeDisabled();
  });

  it('fills an email’s subject and text, and a DM’s text, from Claude’s draft', async () => {
    const sequence = makeOutreachSequence({ steps: [makeOutreachStep(), makeOutreachStep({ kind: 'DM_TASK', subject: '', body: 'Old' })] });
    setup({
      sequence,
      mocks: [
        draftStepMock('seq1', 0, { subject: 'Pods at {company}?', body: 'Hi {name}, quick idea.' }),
        draftStepMock('seq1', 1, { subject: 'ignored', body: 'Hey {name}!' }),
      ],
    });
    fireEvent.click(screen.getByTestId('step-0-draft'));
    await waitFor(() => expect(screen.getAllByRole('textbox', { name: 'Subject' })[0]).toHaveValue('Pods at {company}?'));
    expect(screen.getByRole('textbox', { name: 'Email text' })).toHaveValue('Hi {name}, quick idea.');
    expect(dialogsMock.notify).toHaveBeenCalledWith('Draft written. Check it, then save.', 'success');
    fireEvent.click(screen.getByTestId('step-1-draft'));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'DM to send' })).toHaveValue('Hey {name}!'));
    expect(screen.getAllByRole('textbox', { name: 'Subject' })).toHaveLength(1);
  });

  it('says why a draft could not be written', async () => {
    const sequence = makeOutreachSequence({ steps: [makeOutreachStep()] });
    setup({ sequence, mocks: [draftStepErrorMock('seq1', 0, 'AI is switched off')] });
    fireEvent.click(screen.getByTestId('step-0-draft'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('AI is switched off', 'error'));
    expect(screen.getByRole('textbox', { name: 'Subject' })).toHaveValue('Hello {name}');
  });
});
