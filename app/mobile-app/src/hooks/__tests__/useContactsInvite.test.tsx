import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useContactsInvite } from '@/hooks/useContactsInvite';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const rows = [
  { phone_key: '9000000001', contact_label: 'Asha', invited_at: null },
  { phone_key: '9000000002', contact_label: 'Ravi', invited_at: null },
];

/** The page query answers with `rows`; the invite mutation with `invite`. */
function route(invite: unknown) {
  mockRequest.mockImplementation(async (_doc: unknown, vars: Record<string, unknown>) => {
    if ('phone_keys' in vars) {
      if (invite instanceof Error) throw invite;
      return { inviteContacts: invite };
    }
    return { contactsToInvitePage: { total: rows.length, rows } };
  });
}

async function mount(active = true) {
  const hook = renderHook(() => useContactsInvite(active));
  if (active) await waitFor(() => expect(hook.result.current.rows).toHaveLength(2));
  return hook;
}

beforeEach(() => mockRequest.mockReset());

describe('useContactsInvite', () => {
  it('does not read the phone book while the tab is closed', async () => {
    route({ sent_keys: [] });
    const { result } = await mount(false);
    expect(mockRequest).not.toHaveBeenCalled();
    expect(result.current.rows).toEqual([]);
  });

  it('streams the invitable rows in with paging variables', async () => {
    route({ sent_keys: [] });
    const { result } = await mount();
    expect(mockRequest.mock.calls[0][1]).toEqual({ offset: 0, limit: 200 });
    expect(mockRequest.mock.calls[0][2]).toEqual({ auth: true });
    expect(result.current.total).toBe(2);
  });

  it('toggles a row in and out of the selection', async () => {
    route({ sent_keys: [] });
    const { result } = await mount();
    act(() => result.current.toggleSelect('9000000001'));
    act(() => result.current.toggleSelect('9000000002'));
    expect(result.current.selected).toEqual(['9000000001', '9000000002']);
    act(() => result.current.toggleSelect('9000000001'));
    expect(result.current.selected).toEqual(['9000000002']);
  });

  it('invites one row and marks only the numbers that went', async () => {
    route({ sent_keys: ['9000000001'], sent: 1 });
    const { result } = await mount();
    await act(async () => {
      await result.current.inviteRow('9000000001');
    });
    expect(mockRequest.mock.calls.at(-1)?.[1]).toEqual({ phone_keys: ['9000000001'] });
    expect(result.current.result).toMatchObject({ sent_keys: ['9000000001'] });
    expect(result.current.rows[0]?.invited_at).toEqual(expect.any(String));
    expect(result.current.rows[1]?.invited_at).toBeNull();
    expect(result.current.busyKey).toBeNull();
  });

  it('invites the ticked rows together and clears the selection', async () => {
    route({ sent_keys: ['9000000001', '9000000002'], sent: 2 });
    const { result } = await mount();
    act(() => result.current.toggleSelect('9000000001'));
    act(() => result.current.toggleSelect('9000000002'));
    await act(async () => {
      await result.current.inviteSelected();
    });
    expect(mockRequest.mock.calls.at(-1)?.[1]).toEqual({
      phone_keys: ['9000000001', '9000000002'],
    });
    expect(result.current.selected).toEqual([]);
    expect(result.current.bulkBusy).toBe(false);
    expect(result.current.rows.every((r) => r.invited_at)).toBe(true);
  });

  it('keeps the selection and surfaces the error when the invite fails', async () => {
    const failure = new Error('SMS quota reached');
    route(failure);
    const { result } = await mount();
    act(() => result.current.toggleSelect('9000000001'));
    await act(async () => {
      await result.current.inviteSelected();
    });
    expect(result.current.inviteError).toBe(failure);
    expect(result.current.result).toBeNull();
    expect(result.current.selected).toEqual(['9000000001']);
    expect(result.current.rows[0]?.invited_at).toBeNull();
    expect(result.current.bulkBusy).toBe(false);
  });
});
