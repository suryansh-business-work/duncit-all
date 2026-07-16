import { describe, expect, it, vi } from 'vitest';
import { type MockedResponse } from '@apollo/client/testing';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import CreateUserDialog from '../../src/pages/live-chat/CreateUserDialog';
import { renderWithProviders } from '../testkit';
import { createUserMock } from '../mocks/supportChat.mock';

// Required fields carry a trailing "*" in their accessible name, so match on a
// start-anchored prefix rather than an exact string.
const fill = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const renderDialog = (mocks: MockedResponse[], onClose = vi.fn()) => {
  renderWithProviders(<CreateUserDialog open onClose={onClose} />, { mocks });
  return onClose;
};

describe('CreateUserDialog', () => {
  it('keeps the submit disabled until name, email and an 8+ char password are set', () => {
    renderDialog([]);
    const create = screen.getByRole('button', { name: /create account/i });
    expect(create).toBeDisabled();

    fill(/first name/i, ' Riya ');
    fill(/^email/i, ' riya@example.com ');
    fill(/temporary password/i, 'short'); // < 8 chars → still disabled
    expect(create).toBeDisabled();

    fill(/temporary password/i, 'longenough');
    expect(create).toBeEnabled();
  });

  it('creates a user, trims optional fields to null and shows the success alert', async () => {
    renderDialog([
      createUserMock({
        input: {
          first_name: 'Riya',
          last_name: null,
          email: 'riya@example.com',
          phone_extension: null,
          phone_number: null,
          password: 'longenough',
        },
        result: { user_id: 'u1', full_name: 'Riya', email: 'riya@example.com' },
      }),
    ]);

    fill(/first name/i, 'Riya');
    fill(/^email/i, 'riya@example.com');
    fill(/temporary password/i, 'longenough');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText(/account created for riya@example.com/i)).toBeInTheDocument(),
    );
    // Form resets after success.
    expect(screen.getByLabelText(/first name/i)).toHaveValue('');
  });

  it('sends the optional last name / phone fields when provided', async () => {
    renderDialog([
      createUserMock({
        input: {
          first_name: 'Aman',
          last_name: 'Kumar',
          email: 'aman@example.com',
          phone_extension: '+91',
          phone_number: '9800000000',
          password: 'password1',
        },
        result: { user_id: 'u2', full_name: 'Aman Kumar', email: 'aman@example.com' },
      }),
    ]);

    fill(/first name/i, 'Aman');
    fill(/last name/i, 'Kumar');
    fill(/^email/i, 'aman@example.com');
    fill(/^ext/i, '+91');
    fill(/phone \(optional\)/i, '9800000000');
    fill(/temporary password/i, 'password1');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText(/account created for aman@example.com/i)).toBeInTheDocument(),
    );
  });

  it('surfaces a mutation error', async () => {
    renderDialog([
      createUserMock({
        input: {
          first_name: 'Dev',
          last_name: null,
          email: 'dev@example.com',
          phone_extension: null,
          phone_number: null,
          password: 'password1',
        },
        error: 'Email already registered',
      }),
    ]);

    fill(/first name/i, 'Dev');
    fill(/^email/i, 'dev@example.com');
    fill(/temporary password/i, 'password1');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(screen.getByText(/email already registered/i)).toBeInTheDocument());
  });

  it('falls back to an empty confirmation when the mutation returns no payload', async () => {
    renderDialog([
      createUserMock({
        input: {
          first_name: 'Nia',
          last_name: null,
          email: 'nia@example.com',
          phone_extension: null,
          phone_number: null,
          password: 'password1',
        },
        result: null,
      }),
    ]);

    fill(/first name/i, 'Nia');
    fill(/^email/i, 'nia@example.com');
    fill(/temporary password/i, 'password1');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    // No payload → done stays '' → no success alert, and the form resets.
    await waitFor(() => expect(screen.getByLabelText(/first name/i)).toHaveValue(''));
    expect(screen.queryByText(/account created/i)).not.toBeInTheDocument();
  });

  it('clears the success alert and calls onClose on Close', async () => {
    const onClose = renderDialog([
      createUserMock({
        input: {
          first_name: 'Sam',
          last_name: null,
          email: 'sam@example.com',
          phone_extension: null,
          phone_number: null,
          password: 'password1',
        },
        result: { user_id: 'u3', full_name: 'Sam', email: 'sam@example.com' },
      }),
    ]);

    fill(/first name/i, 'Sam');
    fill(/^email/i, 'sam@example.com');
    fill(/temporary password/i, 'password1');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(screen.getByText(/account created for sam/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText(/account created for sam/i)).not.toBeInTheDocument());
  });
});
