import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { createLeadErrorMock, createLeadMock, makeLeadDetail } from '../mocks';

const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));

import { useTranslation } from '@duncit/app-settings';
import {
  NewLeadDialog,
  NewLeadForm,
  blankNewLeadValues,
  newLeadSchema,
  phoneDigits,
  toLeadInput,
} from '../../src/pages/leads-page/new-lead-form';

afterEach(() => {
  vi.clearAllMocks();
});

const translator = () => renderHook(() => useTranslation()).result.current;

describe('newLeadSchema', () => {
  it('needs a name and accepts blank contacts, checking each one that is given', () => {
    const schema = newLeadSchema(translator().t);
    expect(schema.safeParse(blankNewLeadValues()).success).toBe(false);
    expect(schema.safeParse({ ...blankNewLeadValues(), name: '  Blue Cafe ' }).success).toBe(true);
    const bad = schema.safeParse({
      ...blankNewLeadValues(),
      name: 'x'.repeat(121),
      email: 'nope',
      phone: '12',
      website: 'not a site',
      instagram_handle: 'no way!',
      city: 'x'.repeat(81),
    });
    expect(bad.success).toBe(false);
    const messages = bad.success ? [] : bad.error.issues.map((issue) => [issue.path[0], issue.message]);
    expect(messages).toEqual([
      ['name', 'Keep it under 120 characters.'],
      ['email', 'Enter a valid email.'],
      ['phone', 'Enter 6 to 15 digits.'],
      ['website', 'Enter a web address.'],
      ['instagram_handle', 'Letters, digits, dots and underscores only.'],
      ['city', 'Keep it under 80 characters.'],
    ]);
    expect(
      schema.safeParse({
        ...blankNewLeadValues(),
        name: 'Blue Cafe',
        email: 'hi@bluecafe.in',
        phone: '+91 98765-43210',
        website: 'https://bluecafe.in/menu',
        instagram_handle: '@bluecafe',
      }).success,
    ).toBe(true);
  });

  it('turns the values into the server’s input: lists for the contacts, the handle without its @', () => {
    expect(phoneDigits('+91 (98765) 43-210')).toBe('+919876543210');
    expect(
      toLeadInput({ ...blankNewLeadValues(), name: 'Blue Cafe', email: 'hi@bluecafe.in', phone: '+91 98765 43210', instagram_handle: '@bluecafe', pipeline: 'VENUE' }),
    ).toEqual({
      name: 'Blue Cafe',
      company: '',
      pipeline: 'VENUE',
      source: 'MANUAL',
      stage: 'NEW',
      emails: ['hi@bluecafe.in'],
      phones: ['+919876543210'],
      website: '',
      instagram_handle: 'bluecafe',
      city: '',
    });
    expect(toLeadInput(blankNewLeadValues())).toMatchObject({ emails: [], phones: [], instagram_handle: '' });
  });
});

describe('NewLeadForm', () => {
  it('shows what is wrong, then submits the values and resets once they were saved', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    renderWithProviders(<NewLeadForm busy={false} onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByTestId('new-lead-submit'));
    expect(await screen.findByText('Give the lead a name.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Blue Cafe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nope' } });
    expect(await screen.findByText('Enter a valid email.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'hi@bluecafe.in' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Pune' } });
    fireEvent.click(screen.getByTestId('new-lead-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Blue Cafe', email: 'hi@bluecafe.in', city: 'Pune', pipeline: 'GENERAL' })));
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue(''));
  });

  it('keeps the values when the save did not happen, and offers Cancel', async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    const onCancel = vi.fn();
    renderWithProviders(<NewLeadForm busy={false} onSubmit={onSubmit} onCancel={onCancel} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Blue Cafe' } });
    fireEvent.click(screen.getByTestId('new-lead-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Name')).toHaveValue('Blue Cafe');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('NewLeadDialog', () => {
  const input = { ...toLeadInput({ ...blankNewLeadValues(), name: 'Blue Cafe', pipeline: 'VENUE' }) };

  const pickPipeline = async (dialog: HTMLElement, label: string) => {
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Pipeline' }));
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: label }));
  };

  it('adds the lead, says so, hands back its id and closes', async () => {
    const onClose = vi.fn();
    const onCreated = vi.fn();
    renderWithProviders(<NewLeadDialog open onClose={onClose} onCreated={onCreated} />, { mocks: [createLeadMock(input, makeLeadDetail())] });
    const dialog = screen.getByRole('dialog', { name: 'New lead' });
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Blue Cafe' } });
    await pickPipeline(dialog, 'Venue');
    fireEvent.click(within(dialog).getByTestId('new-lead-submit'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Lead added.', 'success'));
    expect(onCreated).toHaveBeenCalledWith('l1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('says when the lead was merged into one already here', async () => {
    const onCreated = vi.fn();
    renderWithProviders(<NewLeadDialog open onClose={vi.fn()} onCreated={onCreated} />, { mocks: [createLeadMock(input, makeLeadDetail({ id: 'old' }), true)] });
    const dialog = screen.getByRole('dialog', { name: 'New lead' });
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Blue Cafe' } });
    await pickPipeline(dialog, 'Venue');
    fireEvent.click(within(dialog).getByTestId('new-lead-submit'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('That lead was already here. The details were added to it.', 'success'));
    expect(onCreated).toHaveBeenCalledWith('old');
  });

  it('reports a refusal and stays open with the values', async () => {
    const onClose = vi.fn();
    renderWithProviders(<NewLeadDialog open onClose={onClose} onCreated={vi.fn()} />, { mocks: [createLeadErrorMock(input, 'Another lead already has that phone')] });
    const dialog = screen.getByRole('dialog', { name: 'New lead' });
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Blue Cafe' } });
    await pickPipeline(dialog, 'Venue');
    fireEvent.click(within(dialog).getByTestId('new-lead-submit'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Another lead already has that phone', 'error'));
    expect(onClose).not.toHaveBeenCalled();
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Blue Cafe');
  });
});
