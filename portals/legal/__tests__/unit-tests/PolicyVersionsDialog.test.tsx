import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import PolicyVersionsDialog from '../../src/pages/policies/PolicyVersionsDialog';
import type { Policy } from '../../src/graphql/policies';
import { renderWithProviders } from '../testkit';
import { makePolicyHistoryVersion, policyVersionsErrorMock, policyVersionsMock } from '../mocks';

/**
 * Every wording a policy has had, newest first, each readable in place.
 */
const POLICY: Policy = {
  id: 'p1',
  policy_no: 'POL-000001',
  slug: 'privacy-policy',
  title: 'Privacy Policy',
  policy_type: 'Privacy Policy',
  content: '<p>We also collect your locality.</p>',
  is_active: true,
  sort_order: 0,
  version_count: 3,
  content_hash: 'sha256-privacy-policy-v3',
  last_notified_at: null,
  last_notified_count: 0,
  updated_at: '2026-03-04T09:30:00.000Z',
};

const ORIGINAL = makePolicyHistoryVersion();
const UNTRACKED = makePolicyHistoryVersion({
  id: 'pv-2',
  version_no: 2,
  content: '',
  content_hash: 'sha256-privacy-policy-v2',
  updated_by_name: '',
  created_at: '',
});
const LIVE = makePolicyHistoryVersion({
  id: 'pv-3',
  version_no: 3,
  content: '<p>We also collect your locality.</p>',
  content_hash: 'sha256-privacy-policy-v3',
  is_current: true,
});

const open = (mocks: MockedResponse[]) => {
  const onClose = vi.fn();
  renderWithProviders(<PolicyVersionsDialog policy={POLICY} onClose={onClose} />, { mocks });
  return { onClose, dialog: screen.getByRole('dialog') };
};

describe('PolicyVersionsDialog', () => {
  it('lists every wording newest first, with the live one marked', async () => {
    const { dialog } = open([policyVersionsMock([ORIGINAL, LIVE, UNTRACKED])]);
    expect(within(dialog).getByText('Wording history · Privacy Policy')).toBeInTheDocument();
    // Still loading: a spinner rather than an empty list.
    expect(within(dialog).getByRole('progressbar')).toBeInTheDocument();

    await within(dialog).findByText('Version 3');
    const labels = within(dialog)
      .getAllByText(/^Version \d$/)
      .map((node) => node.textContent);
    expect(labels).toEqual(['Version 3', 'Version 2', 'Version 1']);
    expect(within(dialog).getByText('In force now')).toBeInTheDocument();
    expect(within(dialog).getByText(/Editor not recorded/)).toBeInTheDocument();
    expect(within(dialog).getAllByText(/Edited by Priya Sharma/)).toHaveLength(2);
  });

  it('opens one wording at a time and closes it again', async () => {
    const { dialog } = open([policyVersionsMock([ORIGINAL, LIVE, UNTRACKED])]);
    await within(dialog).findByText('Version 3');
    const [live, untracked, original] = within(dialog).getAllByRole('button', { name: 'Read' });

    fireEvent.click(untracked);
    expect(within(dialog).getByText('This version has no content.')).toBeInTheDocument();

    fireEvent.click(original);
    expect(await within(dialog).findByText('We collect your city to show pods near you.')).toBeInTheDocument();
    expect(within(dialog).queryByText('This version has no content.')).not.toBeInTheDocument();

    fireEvent.click(original);
    expect(within(dialog).queryByText('We collect your city to show pods near you.')).not.toBeInTheDocument();
    expect(live).toBeEnabled();
  });

  it('says when there is no history yet', async () => {
    const { dialog } = open([policyVersionsMock([])]);
    expect(await within(dialog).findByText('No wording history yet — this is the original.')).toBeInTheDocument();
  });

  it('says when the history cannot be loaded', async () => {
    const { dialog } = open([policyVersionsErrorMock()]);
    expect(await within(dialog).findByText('Could not load the wording history.')).toBeInTheDocument();
  });

  it('closes from its Close button', async () => {
    const { dialog, onClose } = open([policyVersionsMock([ORIGINAL])]);
    await within(dialog).findByText('Version 1');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
