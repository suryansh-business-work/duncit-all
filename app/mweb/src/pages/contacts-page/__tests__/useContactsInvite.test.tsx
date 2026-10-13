import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';

import { useContactsInvite } from '../useContactsInvite';
import { opLink, type OpHandler } from '../../../__tests__/op-link';
import { fallbackT } from '../../../i18n/fallback';

const notify = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('../../../components/notify', () => notify);

const row = (key: string, invited_at: string | null = null) => ({
  __typename: 'InvitableContact',
  phone_key: key,
  contact_label: `Contact ${key}`,
  invited_at,
});

function mount(active: boolean, handlers: Record<string, OpHandler>) {
  const ops = opLink({
    ContactsToInvitePage: () => ({
      contactsToInvitePage: { __typename: 'ContactsToInvitePage', total: 3, rows: [row('a'), row('b'), row('c', '2026-01-01T00:00:00.000Z')] },
    }),
    ...handlers,
  });
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} link={ops.link}>
      {children}
    </MockedProvider>
  );
  return { ops, ...renderHook(() => useContactsInvite(active), { wrapper }) };
}

const outcome = (over: Record<string, unknown>) => ({
  inviteContacts: {
    __typename: 'InviteResult',
    requested: 1,
    sent: 0,
    skipped: 0,
    failed: 0,
    sent_keys: [],
    ...over,
  },
});

beforeEach(() => {
  notify.notifySuccess.mockReset();
  notify.notifyError.mockReset();
});

describe('useContactsInvite', () => {
  it('asks for nothing while its tab is not open', async () => {
    const { ops, result } = mount(false, {});
    await act(async () => {});
    expect(ops.callsTo('ContactsToInvitePage')).toHaveLength(0);
    expect(result.current.rows).toEqual([]);
  });

  it('streams the contacts to invite in once the tab opens', async () => {
    const { result, ops } = mount(true, {});
    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    expect(ops.callsTo('ContactsToInvitePage')[0]?.variables).toMatchObject({ offset: 0 });
    expect(result.current.total).toBe(3);
  });

  it('toggles a row in and out of the selection', async () => {
    const { result } = mount(true, {});
    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    act(() => result.current.toggleSelect('a'));
    act(() => result.current.toggleSelect('b'));
    expect(result.current.selected).toEqual(['a', 'b']);
    act(() => result.current.toggleSelect('a'));
    expect(result.current.selected).toEqual(['b']);
  });

  it('invites one row, reports the count, and marks only what went as invited', async () => {
    const { result, ops } = mount(true, {
      InviteContacts: () => outcome({ requested: 1, sent: 1, sent_keys: ['a'] }),
    });
    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    await act(async () => {
      await result.current.inviteRow('a');
    });
    expect(ops.callsTo('InviteContacts')[0]?.variables).toEqual({ phone_keys: ['a'] });
    expect(notify.notifySuccess).toHaveBeenCalledWith(fallbackT('mweb.contacts.invitesSent', { count: 1 }));
    expect(result.current.busyKey).toBeNull();
    const byKey = Object.fromEntries(result.current.rows.map((r) => [r.phone_key, r.invited_at]));
    expect(byKey.a).toBeTruthy();
    expect(byKey.b).toBeNull();
  });

  it('invites the ticked rows together and clears the selection', async () => {
    const { result, ops } = mount(true, {
      InviteContacts: () => outcome({ requested: 2, sent: 2, sent_keys: ['a', 'b'] }),
    });
    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    act(() => result.current.toggleSelect('a'));
    act(() => result.current.toggleSelect('b'));
    await act(async () => {
      await result.current.inviteSelected();
    });
    expect(ops.callsTo('InviteContacts')[0]?.variables).toEqual({ phone_keys: ['a', 'b'] });
    expect(result.current.selected).toEqual([]);
    expect(result.current.bulkBusy).toBe(false);
    expect(result.current.rows.filter((r) => r.invited_at)).toHaveLength(3);
  });

  it('says so when the platform held every invite back, and marks nobody', async () => {
    const { result } = mount(true, { InviteContacts: () => outcome({ skipped: 1 }) });
    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    await act(async () => {
      await result.current.inviteRow('a');
    });
    expect(notify.notifyError).toHaveBeenCalledWith(fallbackT('mweb.contacts.invitesSkipped'));
    expect(notify.notifySuccess).not.toHaveBeenCalled();
    expect(result.current.rows.find((r) => r.phone_key === 'a')?.invited_at).toBeNull();
  });

  it('says so when the provider refused every invite', async () => {
    const { result } = mount(true, { InviteContacts: () => outcome({ failed: 1 }) });
    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    await act(async () => {
      await result.current.inviteRow('a');
    });
    expect(notify.notifyError).toHaveBeenCalledWith(fallbackT('mweb.contacts.invitesFailed'));
  });

  it('reports a request that fails outright and clears the busy flag', async () => {
    const { result } = mount(true, {
      InviteContacts: () => {
        throw new Error('Invites are paused');
      },
    });
    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    act(() => result.current.toggleSelect('a'));
    await act(async () => {
      await result.current.inviteSelected();
    });
    expect(notify.notifyError).toHaveBeenCalledWith(expect.stringContaining('Invites are paused'));
    expect(result.current.bulkBusy).toBe(false);
    // The ticked rows stay ticked so the person can simply press again.
    expect(result.current.selected).toEqual(['a']);
  });
});
