import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import AcceptanceDetailDialog from '../../src/pages/policy-acceptance-logs-page/detail/AcceptanceDetailDialog';
import { renderWithProviders } from '../testkit';
import {
  ACCEPTED_HASH,
  acceptanceDetailErrorMock,
  acceptanceDetailMock,
  makeAcceptance,
  makeAcceptanceAccount,
  makeAcceptanceDetail,
  makeAcceptancePolicy,
  makePolicyVersion,
} from '../mocks';

/**
 * Everything on file about ONE acceptance: the record, the person as they read
 * today, the policy as it reads today, every wording, and the trails around it
 * — including the honest answers when a piece of that is gone.
 */

/** Opens and closes the record the way the log page does. */
function Harness() {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <>
      <button type="button" data-testid="open-record" onClick={() => setOpenId('acc-1')}>
        Open record
      </button>
      <AcceptanceDetailDialog acceptanceId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

const openRecord = async (mocks: MockedResponse[]) => {
  renderWithProviders(<Harness />, { mocks });
  fireEvent.click(screen.getByTestId('open-record'));
  return screen.findByRole('dialog');
};

describe('AcceptanceDetailDialog — a full record', () => {
  it('reads out the acceptance, the person, the policy and every wording', async () => {
    const dialog = await openRecord([acceptanceDetailMock()]);
    // Before the record arrives there is only a spinner under a generic subtitle.
    expect(within(dialog).getByText('Everything on file about this one acceptance.')).toBeInTheDocument();
    expect(within(dialog).getByRole('progressbar')).toBeInTheDocument();

    expect(await within(dialog).findByText('This acceptance')).toBeInTheDocument();
    expect(within(dialog).getAllByText(ACCEPTED_HASH).length).toBeGreaterThan(0);
    expect(within(dialog).getByText('ACTIVE')).toBeInTheDocument();
    expect(within(dialog).getByText('+91 98765 43210')).toBeInTheDocument();
    expect(
      within(dialog).getByText('The policy has been edited since. They agreed to an earlier wording.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Version 2')).toBeInTheDocument();
    expect(within(dialog).getByText('In force now')).toBeInTheDocument();
    expect(within(dialog).getByText('They accepted this')).toBeInTheDocument();
    expect(within(dialog).getAllByText(/Edited by Priya Sharma/).length).toBe(2);
    expect(within(dialog).getByText('Terms & Conditions')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Showing their 50 most recent acceptances. The table above holds them all.'),
    ).toBeInTheDocument();
  });

  it('shows a refreshing spinner, not a blank dialog, when a record is reopened', async () => {
    const detail = acceptanceDetailMock();
    let dialog = await openRecord([detail]);
    await within(dialog).findByText('This acceptance');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByTestId('open-record'));
    dialog = screen.getByRole('dialog');

    // The cached record shows at once while the fresh copy is fetched.
    expect(within(dialog).getByText('This acceptance')).toBeInTheDocument();
    expect(within(dialog).getByRole('progressbar')).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).queryByRole('progressbar')).not.toBeInTheDocument());
  });

  it('says so when the record cannot be loaded', async () => {
    const dialog = await openRecord([acceptanceDetailErrorMock()]);
    expect(await within(dialog).findByText('Could not load this acceptance record.')).toBeInTheDocument();
  });
});

describe('AcceptanceDetailDialog — what is missing is said in words', () => {
  it('handles an erased account, a deleted policy and a wording that predates history', async () => {
    const dialog = await openRecord([
      acceptanceDetailMock(
        makeAcceptanceDetail({
          account: null,
          policy: null,
          accepted_version: null,
          versions: [],
          policy_history: [],
          user_acceptances: [],
        }),
      ),
    ]);

    expect(await within(dialog).findByText(/This account has been erased/)).toBeInTheDocument();
    expect(within(dialog).getByText(/This policy has since been deleted/)).toBeInTheDocument();
    expect(within(dialog).getByText(/The exact wording behind this record is not on file/)).toBeInTheDocument();
    expect(within(dialog).getByText('No wording history yet.')).toBeInTheDocument();
    expect(within(dialog).getByText('This is their only acceptance of this policy.')).toBeInTheDocument();
    expect(within(dialog).getByText('They have accepted nothing else.')).toBeInTheDocument();
    // Nothing was capped, so there is no cap to mention.
    expect(within(dialog).queryByText(/Showing their 50 most recent/)).not.toBeInTheDocument();
  });

  it('marks a deleted account with blank details and a current, hidden policy', async () => {
    const dialog = await openRecord([
      acceptanceDetailMock(
        makeAcceptanceDetail({
          acceptance: makeAcceptance({ policy_updated_at: '' }),
          account: makeAcceptanceAccount({
            name: '',
            email: '',
            phone: '',
            status: '',
            is_deleted: true,
            created_at: '',
          }),
          policy: makeAcceptancePolicy({
            policy_no: '',
            policy_type: '',
            is_active: false,
            content_hash: ACCEPTED_HASH,
          }),
          versions: [makePolicyVersion({ updated_by_name: '', created_at: '' })],
        }),
      ),
    ]);

    expect(await within(dialog).findByText(/This account has been deleted/)).toBeInTheDocument();
    expect(within(dialog).getAllByText('—').length).toBeGreaterThanOrEqual(7);
    expect(within(dialog).getByText('They accepted the wording still in force.')).toBeInTheDocument();
    expect(within(dialog).getByText('Inactive')).toBeInTheDocument();
    expect(within(dialog).getByText(/Editor not recorded/)).toBeInTheDocument();
  });
});
