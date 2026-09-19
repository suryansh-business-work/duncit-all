import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../__tests__/testkit';
import SendAdminCredentials from '../SendAdminCredentials';

/** The component keeps its mutation private, so the mock re-declares the exact document. */
const SEND_CREDENTIALS = gql`
  mutation SeedSuperAdmin {
    seedSuperAdmin {
      created
      emailed
      email
    }
  }
`;

const sendMock = (
  result: { created: boolean; emailed: boolean },
  delay = 0,
): MockedResponse => ({
  request: { query: SEND_CREDENTIALS },
  result: {
    data: {
      seedSuperAdmin: { __typename: 'SeedAdminResult', email: 'root@duncit.com', ...result },
    },
  },
  delay,
});

const openDialog = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Send Credentials to Admin' }));
  return screen.getByRole('dialog');
};

/** The five captcha characters shown in the dialog. */
const shownCode = () => screen.getByText(/^[A-Z2-9]{5}$/).textContent ?? '';

const typeEntry = (value: string) => {
  fireEvent.change(screen.getByLabelText('Captcha'), { target: { value } });
};

describe('SendAdminCredentials — the captcha gate', () => {
  it('shows a five-character code and keeps Send disabled until something is typed', () => {
    renderWithProviders(<SendAdminCredentials />);
    openDialog();

    expect(screen.getByText("Confirm you're human")).toBeInTheDocument();
    expect(shownCode()).toMatch(/^[A-HJKMNP-Z2-9]{5}$/);
    expect(screen.getByRole('button', { name: 'Send credentials' })).toBeDisabled();

    typeEntry('ab');
    expect(screen.getByRole('button', { name: 'Send credentials' })).toBeEnabled();
  });

  it('rejects a wrong entry, clears it and never calls the server', async () => {
    renderWithProviders(<SendAdminCredentials />);
    openDialog();

    typeEntry('00000');
    fireEvent.click(screen.getByRole('button', { name: 'Send credentials' }));

    expect(await screen.findByText('That does not match. Please try again.')).toBeInTheDocument();
    expect(screen.getByLabelText('Captcha')).toHaveValue('');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('refreshes to a fresh, empty attempt and drops the mismatch message', async () => {
    renderWithProviders(<SendAdminCredentials />);
    openDialog();

    typeEntry('00000');
    fireEvent.click(screen.getByRole('button', { name: 'Send credentials' }));
    await screen.findByText('That does not match. Please try again.');

    typeEntry('abc');
    fireEvent.click(screen.getByRole('button', { name: 'refresh captcha' }));

    expect(screen.getByLabelText('Captcha')).toHaveValue('');
    expect(screen.queryByText('That does not match. Please try again.')).not.toBeInTheDocument();
    expect(shownCode()).toHaveLength(5);
  });

  it('closes from Cancel and from Escape without sending anything', async () => {
    renderWithProviders(<SendAdminCredentials />);

    openDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.keyDown(openDialog(), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Send Credentials to Admin' })).toBeEnabled();
  });
});

describe('SendAdminCredentials — sending', () => {
  it('accepts the code in any case, sends once and then locks the button', async () => {
    renderWithProviders(<SendAdminCredentials />, {
      mocks: [sendMock({ created: true, emailed: true })],
    });
    openDialog();

    typeEntry(shownCode().toLowerCase());
    fireEvent.click(screen.getByRole('button', { name: 'Send credentials' }));

    expect(
      await screen.findByText('Super admin created: root@duncit.com — credentials emailed.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Credentials sent' })).toBeDisabled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('says so when the super admin already existed and the email could not go out', async () => {
    renderWithProviders(<SendAdminCredentials />, {
      mocks: [sendMock({ created: false, emailed: false })],
    });
    openDialog();

    typeEntry(shownCode());
    fireEvent.click(screen.getByRole('button', { name: 'Send credentials' }));

    expect(
      await screen.findByText('Super admin already exists: root@duncit.com — email not sent (check SMTP).'),
    ).toBeInTheDocument();
  });

  it('locks every control and ignores Escape while the send is in flight', async () => {
    renderWithProviders(<SendAdminCredentials />, {
      mocks: [sendMock({ created: true, emailed: true }, 60)],
    });
    openDialog();

    typeEntry(shownCode());
    fireEvent.click(screen.getByRole('button', { name: 'Send credentials' }));

    const sending = await screen.findByRole('button', { name: 'Sending…' });
    expect(sending).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'refresh captcha' })).toBeDisabled();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    expect(
      await screen.findByText('Super admin created: root@duncit.com — credentials emailed.'),
    ).toBeInTheDocument();
  });

  it('shows the server error and keeps the dialog open for another try', async () => {
    renderWithProviders(<SendAdminCredentials />, {
      mocks: [{ request: { query: SEND_CREDENTIALS }, error: new Error('SMTP is not configured') }],
    });
    openDialog();

    typeEntry(shownCode());
    fireEvent.click(screen.getByRole('button', { name: 'Send credentials' }));

    expect(await screen.findByText('SMTP is not configured')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Credentials to Admin' })).toBeEnabled();
  });
});
