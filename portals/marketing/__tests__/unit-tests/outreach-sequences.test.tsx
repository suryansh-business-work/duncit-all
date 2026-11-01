import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import {
  enrollCountMock,
  makeOutreachSequence,
  makeWaTemplate,
  outreachSequencesErrorMock,
  outreachSequencesMock,
  saveSequenceErrorMock,
  saveSequenceMock,
  setSequenceActiveErrorMock,
  setSequenceActiveMock,
  waTemplatesErrorMock,
  waTemplatesMock,
} from '../mocks';

const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));

import SequencesTab from '../../src/pages/outreach-page/sequences/SequencesTab';
import { blankSequenceValues, sequenceValuesFrom, toSequenceInput } from '../../src/pages/outreach-page/sequence-form';

afterEach(() => {
  vi.clearAllMocks();
});

const SEQ = makeOutreachSequence();
const renderTab = (mocks: MockedResponse[], canManage = true) => renderWithProviders(<SequencesTab canManage={canManage} />, { mocks });

describe('SequencesTab', () => {
  it('says when there are no sequences yet', async () => {
    renderTab([outreachSequencesMock([])]);
    expect(await screen.findByTestId('sequences-empty')).toHaveTextContent('No sequences yet. Create one to start reaching your leads.');
  });

  it('says when the sequences could not be read', async () => {
    renderTab([outreachSequencesErrorMock('Sequences unavailable')]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sequences unavailable');
  });

  it('shows each sequence’s steps, pipeline, pace, counts and a link to its enrollments', async () => {
    renderTab([outreachSequencesMock([SEQ, makeOutreachSequence({ id: 'seq2', name: 'Anyone', pipeline: null })])]);
    const card = await screen.findByTestId('sequence-card-seq1');
    expect(within(card).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['1. Email', '2. Wait', '3. WhatsApp', '4. DM task']);
    expect(screen.getByTestId('sequence-meta-seq1')).toHaveTextContent('Pipeline: Venue · 5 of 40 sends today');
    expect(screen.getByTestId('sequence-meta-seq2')).toHaveTextContent('Pipeline: Any pipeline');
    for (const chip of ['Active: 3', 'Paused: 1', 'Replied: 1', 'Opted out: 0', 'Done: 1', 'Failed: 0']) {
      expect(within(card).getByText(chip)).toBeInTheDocument();
    }
    expect(within(card).getByRole('link', { name: 'See 6 enrollments' })).toHaveAttribute('href', '/outreach/sequences?selectedtab=enrollments&sequence=seq1');
    expect(within(card).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Enroll leads' })).toBeInTheDocument();
  });

  it('switches a sequence on and off for a manager, and reports a refusal', async () => {
    const on = { ...SEQ, active: true };
    renderTab([outreachSequencesMock([SEQ]), setSequenceActiveMock(SEQ, true), setSequenceActiveMock(on, false)]);
    const toggle = await screen.findByTestId('sequence-switch-seq1');
    fireEvent.click(within(toggle).getByRole('switch', { name: 'Switch Venue intro on or off' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Venue intro is on.', 'success'));
    await waitFor(() => expect(within(screen.getByTestId('sequence-switch-seq1')).getByRole('switch')).toBeChecked());
    fireEvent.click(within(screen.getByTestId('sequence-switch-seq1')).getByRole('switch'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Venue intro is off.', 'success'));
  });

  it('reports a switch the server refused', async () => {
    renderTab([outreachSequencesMock([SEQ]), setSequenceActiveErrorMock('seq1', true, 'Step 3 needs an approved template')]);
    fireEvent.click(within(await screen.findByTestId('sequence-switch-seq1')).getByRole('switch'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Step 3 needs an approved template', 'error'));
    expect(within(screen.getByTestId('sequence-switch-seq1')).getByRole('switch')).not.toBeChecked();
  });

  it('edits a sequence, saves it as the form holds it and reads the list again', async () => {
    const input = toSequenceInput({ ...sequenceValuesFrom(SEQ), name: 'Venue intro v2' });
    renderTab([
      outreachSequencesMock([SEQ]),
      waTemplatesMock([makeWaTemplate()]),
      saveSequenceMock('seq1', input, { ...SEQ, name: 'Venue intro v2' }),
      outreachSequencesMock([{ ...SEQ, name: 'Venue intro v2' }]),
    ]);
    fireEvent.click(await screen.findByTestId('sequence-edit-seq1'));
    const dialog = screen.getByRole('dialog', { name: 'Edit sequence' });
    const name = within(dialog).getByRole('textbox', { name: 'Name' });
    expect(name).toHaveValue('Venue intro');
    fireEvent.change(name, { target: { value: 'Venue intro v2' } });
    await screen.findByTestId('step-2-template');
    fireEvent.click(within(dialog).getByTestId('sequence-submit'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Sequence saved.', 'success'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit sequence' })).not.toBeInTheDocument());
  });

  it('creates a sequence from the blank form', async () => {
    const values = { ...blankSequenceValues(), name: 'Host hello', steps: [{ ...blankSequenceValues().steps[0], subject: 'Hi', body: 'Hello there' }] };
    const created = makeOutreachSequence({ id: 'seq9', name: 'Host hello' });
    renderTab([outreachSequencesMock([]), waTemplatesMock([]), saveSequenceMock(null, toSequenceInput(values), created), outreachSequencesMock([created])]);
    fireEvent.click(screen.getByTestId('new-sequence'));
    const dialog = screen.getByRole('dialog', { name: 'New sequence' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), { target: { value: 'Host hello' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Subject' }), { target: { value: 'Hi' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Email text' }), { target: { value: 'Hello there' } });
    fireEvent.click(within(dialog).getByTestId('sequence-submit'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Sequence saved.', 'success'));
    expect(await screen.findByTestId('sequence-card-seq9')).toBeInTheDocument();
  });

  it('keeps the dialog open on a refused save, and warns when the templates cannot be read', async () => {
    const values = { ...blankSequenceValues(), name: 'Host hello', steps: [{ ...blankSequenceValues().steps[0], subject: 'Hi', body: 'Hello' }] };
    renderTab([outreachSequencesMock([]), waTemplatesErrorMock('AiSensy is not configured'), saveSequenceErrorMock(null, toSequenceInput(values), 'A sequence with that name exists')]);
    fireEvent.click(screen.getByTestId('new-sequence'));
    const dialog = screen.getByRole('dialog', { name: 'New sequence' });
    expect(await within(dialog).findByText('AiSensy is not configured')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Name' }), { target: { value: 'Host hello' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Subject' }), { target: { value: 'Hi' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Email text' }), { target: { value: 'Hello' } });
    fireEvent.click(within(dialog).getByTestId('sequence-submit'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('A sequence with that name exists', 'error'));
    expect(screen.getByRole('dialog', { name: 'New sequence' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New sequence' })).not.toBeInTheDocument());
  });

  it('shows an editor an active sequence read-only, and an inactive one to edit, with no switch or enroll', async () => {
    renderTab([outreachSequencesMock([{ ...SEQ, active: true }, makeOutreachSequence({ id: 'seq2', name: 'Draft one' })]), waTemplatesMock([makeWaTemplate()])], false);
    expect(await screen.findByTestId('sequence-state-seq1')).toHaveTextContent('On');
    expect(screen.queryByTestId('sequence-enroll-seq1')).not.toBeInTheDocument();
    expect(screen.getByTestId('sequence-edit-seq2')).toHaveTextContent('Edit');
    fireEvent.click(screen.getByTestId('sequence-edit-seq1'));
    expect(screen.getByTestId('sequence-edit-seq1')).toHaveTextContent('View');
    const dialog = screen.getByRole('dialog', { name: 'Edit sequence' });
    expect(within(dialog).getByTestId('sequence-read-only')).toHaveTextContent('This sequence is on. Only a manager can change it');
    expect(within(dialog).queryByTestId('sequence-submit')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toBeDisabled();
  });

  it('opens the enroll dialog from a card and closes it again', async () => {
    renderTab([outreachSequencesMock([SEQ]), enrollCountMock('seq1', { pipeline: 'VENUE', stage: null, city: null }, 4)]);
    fireEvent.click(await screen.findByTestId('sequence-enroll-seq1'));
    const dialog = screen.getByRole('dialog', { name: 'Enroll leads in Venue intro' });
    expect(await within(dialog).findByText('4 leads would be enrolled now.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Enroll leads in Venue intro' })).not.toBeInTheDocument());
  });
});
