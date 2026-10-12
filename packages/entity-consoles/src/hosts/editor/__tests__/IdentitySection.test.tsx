import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { ACCOUNT_CANDIDATES } from '../../../shared/AccountPicker';
import { renderForm } from '../../../venues/editor/__tests__/harness';
import IdentitySection from '../sections/IdentitySection';
import { blankHostValues, type HostFormValues } from '../types';

const rows = [
  {
    __typename: 'UserRow',
    user_id: 'u1',
    full_name: 'Ananya Iyer',
    email: 'ananya@example.com',
    phone_number: '9820045612',
  },
  { __typename: 'UserRow', user_id: 'u2', full_name: 'Only Name', email: null, phone_number: null },
  { __typename: 'UserRow', user_id: 'u3', full_name: null, email: 'only@example.com', phone_number: null },
];

const accountsMock = (): MockedResponse => ({
  request: { query: ACCOUNT_CANDIDATES, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { usersTable: { __typename: 'UsersTablePage', total: rows.length, rows } } },
});

const renderIdentity = (isEdit: boolean, over: Partial<HostFormValues> = {}) =>
  renderForm<HostFormValues>(
    { ...blankHostValues, ...over },
    ({ control, setValue }) => <IdentitySection control={control} setValue={setValue} isEdit={isEdit} />,
    [accountsMock()],
  );

describe('Host IdentitySection', () => {
  it('locks the account on an existing host but keeps the onboarding details editable', () => {
    const { form } = renderIdentity(true, { full_name: 'Ananya Iyer', phone: '9820045612' });

    expect(screen.getByText(/The account cannot be changed here/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /Duncit account/ })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Full name/ })).toHaveValue('Ananya Iyer');

    fireEvent.change(screen.getByRole('textbox', { name: /^Phone/ }), { target: { value: '9820045699' } });
    fireEvent.change(screen.getByRole('textbox', { name: /^Address/ }), {
      target: { value: 'B-702, Powai' },
    });
    expect(form().getValues('phone')).toBe('9820045699');
    expect(form().getValues('full_address')).toBe('B-702, Powai');
  });

  it('copies the chosen account’s name, email and phone onto the record when creating', async () => {
    const { form } = renderIdentity(false);

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /Duncit account/ }));
    fireEvent.click(await screen.findByText('Ananya Iyer · ananya@example.com'));

    await waitFor(() => expect(form().getValues('user_id')).toBe('u1'));
    expect(form().getValues('full_name')).toBe('Ananya Iyer');
    expect(form().getValues('email')).toBe('ananya@example.com');
    expect(form().getValues('phone')).toBe('9820045612');
  });

  it('blanks a detail the chosen account has none of rather than keeping the previous pick’s', async () => {
    const { form } = renderIdentity(false, {
      full_name: 'Old',
      email: 'old@example.com',
      phone: '9000000000',
    });

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /Duncit account/ }));
    fireEvent.click(await screen.findByText('Only Name'));
    await waitFor(() => expect(form().getValues('full_name')).toBe('Only Name'));
    expect(form().getValues('email')).toBe('');
    expect(form().getValues('phone')).toBe('');

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Duncit account/ }));
    fireEvent.click(await screen.findByText('only@example.com'));
    await waitFor(() => expect(form().getValues('email')).toBe('only@example.com'));
    expect(form().getValues('full_name')).toBe('');
  });

  it('adds a free-text tag to the host', () => {
    const { form } = renderIdentity(true);
    const tags = screen.getByRole('combobox', { name: 'Tags' });

    fireEvent.change(tags, { target: { value: 'repeat-host' } });
    fireEvent.keyDown(tags, { key: 'Enter' });

    expect(form().getValues('tags')).toEqual(['repeat-host']);
  });

  it('clears the account id when the pick is cleared, leaving the copied details alone', async () => {
    const { form } = renderIdentity(false);

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /Duncit account/ }));
    fireEvent.click(await screen.findByText('Ananya Iyer · ananya@example.com'));
    await waitFor(() => expect(form().getValues('user_id')).toBe('u1'));

    fireEvent.click(screen.getByTitle('Clear'));
    await waitFor(() => expect(form().getValues('user_id')).toBe(''));
    expect(form().getValues('full_name')).toBe('Ananya Iyer');
  });
});
