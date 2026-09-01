import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApolloProvider } from '@apollo/client/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { usernameBlocksSave, type UsernameStatus } from '@duncit/utils';
import UsernameField from '../UsernameField';
import type { AccountEditValues } from '../../account-edit/account-edit.types';

const query = vi.fn();

vi.mock('@duncit/logs', () => ({ logs: { mWeb: { error: vi.fn() } } }));

const client = { query } as never;
const CURRENT = 'ravi-9x3m';

/**
 * The field plus the one thing it is there to drive — Edit profile's Save,
 * which the field shares with the rest of the form.
 */
function Host({ current }: Readonly<{ current: string | null }>) {
  const { control } = useForm<AccountEditValues, any, AccountEditValues>({
    defaultValues: { username: current ?? '' } as AccountEditValues,
  });
  const [status, setStatus] = useState<UsernameStatus>('IDLE');
  return (
    <>
      <UsernameField control={control} current={current} onStatusChange={setStatus} />
      <button type="button" disabled={usernameBlocksSave(status, !!current)}>
        Save
      </button>
    </>
  );
}

const answer = (username: string, available: boolean, reason: string | null = null) =>
  Promise.resolve({ data: { usernameAvailability: { username, available, reason } } });

const origin = () => globalThis.window.location.origin;

beforeEach(() => {
  query.mockReset();
});

const renderField = (current: string | null = CURRENT) =>
  render(
    <ApolloProvider client={client}>
      <Host current={current} />
    </ApolloProvider>,
  );

const save = () => screen.getByRole('button', { name: 'Save' });

describe('UsernameField', () => {
  it('opens on the handle the account has, with the link it already produces', async () => {
    renderField();
    expect(screen.getByLabelText('Username')).toHaveValue(CURRENT);
    expect(screen.getByTestId('username-link-preview')).toHaveTextContent(
      `${origin()}/u/${CURRENT}`,
    );
    expect(screen.getByText('This is your username.')).toBeInTheDocument();
    await waitFor(() => expect(save()).toBeEnabled());
  });

  it('lowercases what is typed, so the field and the server agree on the value', async () => {
    query.mockReturnValue(answer('ravi-plays', true));
    renderField();
    const input = screen.getByLabelText('Username');
    fireEvent.change(input, { target: { value: 'Ravi-Plays' } });
    expect(input).toHaveValue('ravi-plays');
  });

  it('previews the new link and enables Save once the server says the handle is free', async () => {
    query.mockReturnValue(answer('ravi-plays', true));
    renderField();
    const input = screen.getByLabelText('Username');
    fireEvent.change(input, { target: { value: 'ravi-plays' } });

    await waitFor(() => expect(screen.getByText('@ravi-plays is available.')).toBeInTheDocument());
    expect(screen.getByTestId('username-link-preview')).toHaveTextContent(
      `${origin()}/u/ravi-plays`,
    );
    expect(save()).toBeEnabled();
  });

  it('disables Save on a taken handle, and keeps the link the account still has', async () => {
    query.mockReturnValue(answer('ravi-plays', false, 'TAKEN'));
    renderField();
    const input = screen.getByLabelText('Username');
    fireEvent.change(input, { target: { value: 'ravi-plays' } });

    await waitFor(() =>
      expect(screen.getByText('That username is already taken.')).toBeInTheDocument(),
    );
    expect(save()).toBeDisabled();
    expect(screen.getByTestId('username-link-preview')).toHaveTextContent(
      `${origin()}/u/${CURRENT}`,
    );
  });

  it('disables Save on a malformed handle without asking the server', async () => {
    renderField();
    const input = screen.getByLabelText('Username');
    fireEvent.change(input, { target: { value: 'ab' } });

    await waitFor(() => expect(save()).toBeDisabled());
    expect(
      screen.getByText('Use 3–30 lowercase letters, numbers and single hyphens.'),
    ).toBeInTheDocument();
    expect(query).not.toHaveBeenCalled();
  });

  it('disables Save while the account has a handle and the field is emptied', async () => {
    renderField();
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: '' } });
    await waitFor(() => expect(save()).toBeDisabled());
  });

  it('lets a pre-handle account save the rest of the profile with the field left empty', async () => {
    renderField(null);
    expect(screen.queryByTestId('username-link-preview')).not.toBeInTheDocument();
    await waitFor(() => expect(save()).toBeEnabled());
  });
});
