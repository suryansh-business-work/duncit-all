import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { CRM_EMAIL_STATUSES, CRM_VERIFY_EMAIL } from '@/api/emailVerification.gql';
import { EmailStatusBadge, EmailStatusChip, EmailStatusProvider } from '@/components/email-status';

const notifyError = vi.hoisted(() => vi.fn());
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError,
}));

const statusesMock = (emails: string[], rows: object[]): MockedResponse => ({
  request: { query: CRM_EMAIL_STATUSES, variables: { emails } },
  result: { data: { crmEmailStatuses: rows.map((row) => ({ __typename: 'CrmEmailStatusEntry', ...row })) } },
});

const verification = {
  __typename: 'CrmEmailVerification',
  id: 'r1',
  email: 'ravi@example.com',
  status: 'VERIFIED',
  is_valid_syntax: true,
  accepts_mail: true,
  is_deliverable: true,
  is_catch_all: false,
  is_disposable: false,
  is_role_account: false,
  suggestion: '',
  source: 'SINGLE',
  checked_by: 'crm@duncit.com',
  created_at: '2026-10-14T10:00:00.000Z',
};

const renderBadges = (emails: string[], mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={mocks}>
      <EmailStatusProvider>
        {emails.map((email) => (
          <EmailStatusBadge key={email} email={email} />
        ))}
      </EmailStatusProvider>
    </MockedProvider>,
  );

describe('EmailStatusBadge', () => {
  it('shows a green tick for a verified address and "Not checked" for one never checked, in one lookup', async () => {
    renderBadges(
      ['asha@example.com', 'ravi@example.com'],
      [
        statusesMock(
          ['asha@example.com', 'ravi@example.com'],
          [{ email: 'asha@example.com', status: 'VERIFIED', checked_at: '2026-10-14T10:00:00.000Z', suggestion: 'asha@example.co' }],
        ),
      ],
    );

    const verified = await screen.findByTestId('email-status-verified');
    expect(verified).toHaveTextContent('Verified');
    expect(verified.querySelector('[data-testid="CheckCircleIcon"]')).not.toBeNull();
    expect(verified.className).toMatch(/colorSuccess/);
    expect(screen.getByTestId('email-status-not_checked')).toHaveTextContent('Not checked');
  });

  it('checks an address when its badge is clicked and shows the new verdict', async () => {
    renderBadges(
      ['ravi@example.com'],
      [
        statusesMock(['ravi@example.com'], []),
        // Held briefly so the in-flight "checking" badge stays on screen long enough to assert.
        { request: { query: CRM_VERIFY_EMAIL, variables: { email: 'ravi@example.com' } }, result: { data: { crmVerifyEmail: verification } }, delay: 200 },
      ],
    );

    fireEvent.click(await screen.findByTestId('email-status-not_checked'));

    expect(await screen.findByTestId('email-status-checking')).toBeInTheDocument();
    expect(await screen.findByTestId('email-status-verified')).toBeInTheDocument();
  });

  it('tells the person why a check failed and keeps the old status', async () => {
    renderBadges(
      ['ravi@example.com'],
      [
        statusesMock(['ravi@example.com'], []),
        { request: { query: CRM_VERIFY_EMAIL, variables: { email: 'ravi@example.com' } }, error: new Error('Email verifier is unreachable') },
      ],
    );

    fireEvent.click(await screen.findByTestId('email-status-not_checked'));

    await vi.waitFor(() => expect(notifyError).toHaveBeenCalledWith(expect.stringMatching(/unreachable/)));
    expect(await screen.findByTestId('email-status-not_checked')).toBeInTheDocument();
  });

  it('shows nothing when the lookup itself failed', async () => {
    renderBadges(['asha@example.com'], [
      { request: { query: CRM_EMAIL_STATUSES, variables: { emails: ['asha@example.com'] } }, error: new Error('offline') },
    ]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByTestId(/^email-status-/)).toBeNull();
  });

  it('renders nothing for a blank address or outside the CRM provider', () => {
    const { container } = render(
      <>
        <EmailStatusBadge email="asha@example.com" />
        <EmailStatusBadge email="  " />
        <EmailStatusBadge email={null} />
      </>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('EmailStatusChip', () => {
  it.each([
    ['RISKY', 'Risky', /colorWarning/],
    ['INVALID', 'Invalid', /colorError/],
    ['UNKNOWN', 'Unknown', /colorDefault/],
  ] as const)('labels %s as "%s" in its colour', (status, label, colour) => {
    render(<EmailStatusChip status={status} />);
    const chip = screen.getByTestId(`email-status-${status.toLowerCase()}`);
    expect(chip).toHaveTextContent(label);
    expect(chip.className).toMatch(colour);
  });
});
