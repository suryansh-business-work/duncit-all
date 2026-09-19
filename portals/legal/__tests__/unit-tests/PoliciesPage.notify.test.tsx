import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { notifySuccess } from '@duncit/dialogs';
import PoliciesPage from '../../src/pages/policies/PoliciesPage';
import { renderWithProviders } from '../testkit';
import {
  makePolicy,
  makePolicyHistoryVersion,
  notifyPolicyMock,
  policyVersionsMock,
  recipientCountMock,
  updatePolicyMatchingMock,
} from '../mocks';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock(import('@duncit/dialogs'), async (importOriginal) => ({
  ...(await importOriginal()),
  notifySuccess: vi.fn(),
}));

/**
 * Telling everyone who accepted a policy that it changed — from the row, or
 * as part of an edit — and reading back every wording it has had.
 */
const SUMMARY = 'Clause 4 now names the locality we store.';

const renderPage = (mocks: MockedResponse[] = []) => renderWithProviders(<PoliciesPage />, { mocks });

const openNotice = async () => {
  await screen.findByText('Privacy Policy');
  fireEvent.click(screen.getByRole('button', { name: 'Send the notice now' }));
  return screen.findByRole('dialog');
};

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
  __setTableRows([makePolicy()]);
});

describe('PoliciesPage — change notices from the row', () => {
  it('asks first, then says how many people the notice reached', async () => {
    renderPage([notifyPolicyMock(12)]);
    const dialog = await openNotice();
    expect(within(dialog).getByText('Send the change notice?')).toBeInTheDocument();
    expect(within(dialog).getByText(/“Privacy Policy”/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Send the notice now' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Notice sent to 12 people.'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('says so when nobody was there to tell', async () => {
    renderPage([notifyPolicyMock(0)]);
    const dialog = await openNotice();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send the notice now' }));

    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith('Nobody has accepted this policy yet, so no notice was sent.'),
    );
  });

  it('backs out without sending anything', async () => {
    renderPage();
    const dialog = await openNotice();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});

describe('PoliciesPage — notice with an edit', () => {
  it('sends the tick and the summary with the update', async () => {
    renderPage([
      recipientCountMock(12),
      updatePolicyMatchingMock((variables) => {
        const input = variables.input as { notify_accepted_users: boolean; notify_summary: string };
        return (
          variables.id === 'p1' && input.notify_accepted_users && input.notify_summary === SUMMARY
        );
      }),
    ]);
    await screen.findByText('Privacy Policy');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');

    await within(dialog).findByText('This would reach 12 people who have accepted it.');
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Email everyone who has accepted this policy' }));
    fireEvent.change(within(dialog).getByLabelText('What changed (optional)'), {
      target: { value: `  ${SUMMARY}  ` },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Policy updated'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('PoliciesPage — wording history', () => {
  it('opens every wording of the policy and closes again', async () => {
    renderPage([policyVersionsMock([makePolicyHistoryVersion({ is_current: true })])]);
    await screen.findByText('Privacy Policy');
    fireEvent.click(screen.getByRole('button', { name: 'History' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Wording history · Privacy Policy')).toBeInTheDocument();
    expect(await within(dialog).findByText('Version 1')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
