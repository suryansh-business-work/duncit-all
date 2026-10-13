import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderForm } from '../../venues/editor/__tests__/harness';
import AccountPicker, { ACCOUNT_CANDIDATES } from '../AccountPicker';

interface Values {
  user_id: string;
}

const rows = [
  { __typename: 'UserRow', user_id: 'u1', full_name: 'Ananya Iyer', email: 'ananya@example.com', phone_number: null },
  { __typename: 'UserRow', user_id: 'u2', full_name: 'Ben', email: null, phone_number: '9820045612' },
];

const accountsMock = (): MockedResponse => ({
  request: { query: ACCOUNT_CANDIDATES, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { usersTable: { __typename: 'UsersTablePage', total: rows.length, rows } } },
});

const mount = (onPicked = vi.fn()) => {
  const view = renderForm<Values>(
    { user_id: '' },
    ({ control }) => (
      <AccountPicker<Values>
        control={control}
        name="user_id"
        label="Duncit account"
        hint="The person this record is for."
        onPicked={onPicked}
      />
    ),
    [accountsMock()],
  );
  return { ...view, onPicked };
};

const combobox = () => screen.getByRole('combobox', { name: /Duncit account/ });

describe('AccountPicker', () => {
  it('labels an account by name and email, falling back to the phone when it has no email', async () => {
    mount();
    fireEvent.mouseDown(combobox());
    expect(await screen.findByText('Ananya Iyer · ananya@example.com')).toBeInTheDocument();
    expect(screen.getByText('Ben · 9820045612')).toBeInTheDocument();
  });

  it('writes the chosen account\'s id and hands the account to the caller', async () => {
    const { form, onPicked } = mount();
    fireEvent.mouseDown(combobox());
    fireEvent.click(await screen.findByText('Ben · 9820045612'));

    await waitFor(() => expect(form().getValues('user_id')).toBe('u2'));
    expect(onPicked).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u2' }));
    expect(screen.getByText('The person this record is for.')).toBeInTheDocument();
  });

  it('clears the id, and does not call the caller, when the pick is cleared', async () => {
    const { form, onPicked } = mount();
    fireEvent.mouseDown(combobox());
    fireEvent.click(await screen.findByText('Ben · 9820045612'));
    await waitFor(() => expect(form().getValues('user_id')).toBe('u2'));
    onPicked.mockClear();

    fireEvent.click(screen.getByTitle('Clear'));
    await waitFor(() => expect(form().getValues('user_id')).toBe(''));
    expect(onPicked).not.toHaveBeenCalled();
  });

  it('shows the form\'s validation message under the field', async () => {
    const { form } = mount();
    act(() => form().setError('user_id', { type: 'required', message: 'Choose a Duncit account.' }));
    expect(await screen.findByText('Choose a Duncit account.')).toBeInTheDocument();
    expect(combobox()).toHaveAttribute('aria-invalid', 'true');
  });
});
