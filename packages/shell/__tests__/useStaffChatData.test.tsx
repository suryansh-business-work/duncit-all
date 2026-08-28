/**
 * The staff-chat data layer, driven directly.
 *
 * The panel's own tests stop at the render; this drives the hook underneath —
 * the optimistic outbox, the failed-send retry, the upload path, the cursor
 * paging and the presence fallbacks — with Apollo replaced by per-operation
 * stubs so a send can fail on demand.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const uploadMock = vi.hoisted(() => vi.fn());
vi.mock('@duncit/media-picker', () => ({
  useImagekitDirectUpload: () => ({ upload: uploadMock, uploading: false }),
}));

vi.mock('../src/lib/runtime', () => ({
  useShellRuntime: () => ({ graphqlUrl: 'https://server.test/graphql', tokenKey: 'tok' }),
  readToken: () => 'tok-123',
}));

const socketSeen = vi.hoisted(() => ({ onMessage: null as null | ((m: unknown) => void) }));
vi.mock('../src/staff-chat/useStaffSocket', () => ({
  useStaffSocket: (opts: { onMessage: (m: unknown) => void }) => {
    socketSeen.onMessage = opts.onMessage;
    return { socket: null, typing: vi.fn(), typingAt: 0 };
  },
}));

const presenceState = vi.hoisted(() => ({
  others: {} as Record<string, string>,
  lastSeen: {} as Record<string, string>,
}));
vi.mock('../src/staff-chat/usePresence', () => ({ usePresence: () => presenceState }));

const exporter = vi.hoisted(() => ({ build: vi.fn(() => 'EXPORT'), download: vi.fn() }));
vi.mock('../src/staff-chat/export-chat', () => ({
  buildChatExport: exporter.build,
  downloadChatExport: exporter.download,
}));

/** Apollo replaced per OPERATION NAME, so each query/mutation is addressable. */
const harness = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
  queries: {} as Record<
    string,
    { data: unknown; loading: boolean; refetch: ReturnType<typeof vi.fn> }
  >,
  mutations: {} as Record<string, ReturnType<typeof vi.fn>>,
  client: {
    query: vi.fn(),
    refetchQueries: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('@apollo/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client')>();
  type Doc = { definitions: { kind: string; name?: { value: string } }[] };
  const opName = (doc: Doc) =>
    doc.definitions.find((d) => d.kind === 'OperationDefinition')?.name?.value ?? '?';
  return {
    ...actual,
    useApolloClient: () => harness.client,
    useQuery: (doc: Doc) => {
      const name = opName(doc);
      harness.queries[name] ??= {
        data: undefined,
        loading: false,
        refetch: vi.fn(() => Promise.resolve()),
      };
      const q = harness.queries[name];
      q.data = harness.data[name];
      return q;
    },
    useMutation: (doc: Doc) => {
      const name = opName(doc);
      harness.mutations[name] ??= vi.fn(() => Promise.resolve({ data: {} }));
      return [harness.mutations[name], { loading: false }];
    },
  };
});

import { useStaffChatData } from '../src/staff-chat/useStaffChatData';
import type { Coworker, StaffMessage } from '../src/staff-chat/queries';

const asha: Coworker = {
  id: 'u1',
  name: 'Asha Rao',
  email: 'asha@duncit.com',
  photo: '',
  roles: ['FINANCE_MANAGER'],
};

const live = (id: string, text: string, at: string): StaffMessage => ({
  id,
  from_user_id: 'u1',
  to_user_id: 'me',
  text,
  created_at: at,
});

const mount = (over: Partial<Parameters<typeof useStaffChatData>[0]> = {}) =>
  renderHook(() =>
    useStaffChatData({
      open: true,
      peer: asha,
      meId: 'me',
      meName: 'Vikram N',
      search: '',
      role: '',
      ...over,
    })
  );

beforeEach(() => {
  harness.data = {};
  harness.queries = {};
  harness.mutations = {};
  harness.client.query = vi.fn();
  harness.client.refetchQueries = vi.fn(() => Promise.resolve([]));
  uploadMock.mockReset();
  exporter.build.mockClear();
  exporter.download.mockClear();
  presenceState.others = {};
  presenceState.lastSeen = {};
});

describe('sending', () => {
  it('shows the message immediately, then swaps it for the server copy', async () => {
    const { result } = mount();
    act(() => result.current.send('court is booked'));

    // On screen before the network answers, with a pending marker.
    const optimistic = result.current.visibleMessages.find((m) => m.text === 'court is booked');
    expect(optimistic?.pending).toBe(true);
    expect(optimistic?.id.startsWith('pending-')).toBe(true);

    await waitFor(() =>
      expect(result.current.visibleMessages.find((m) => m.text === 'court is booked')).toBeUndefined()
    );
    expect(harness.mutations.SendStaffMessage).toHaveBeenCalledWith({
      variables: expect.objectContaining({ toUserId: 'u1', text: 'court is booked', attachmentUrl: null }),
    });
    // The thread, the thread list and the unread badge all re-read.
    expect(harness.queries.StaffMessages.refetch).toHaveBeenCalled();
    expect(harness.queries.StaffThreads.refetch).toHaveBeenCalled();
    expect(harness.client.refetchQueries).toHaveBeenCalled();
  });

  it('keeps a failed send on screen, and retry posts the same words again', async () => {
    const { result } = mount();
    // Prime the mutation registry, then make the first attempt fail.
    act(() => result.current.send('warm-up'));
    await waitFor(() => expect(harness.mutations.SendStaffMessage).toHaveBeenCalled());
    harness.mutations.SendStaffMessage.mockRejectedValueOnce(new Error('offline'));

    act(() => result.current.send('did not go'));
    await waitFor(() =>
      expect(result.current.visibleMessages.find((m) => m.text === 'did not go')?.failed).toBe(true)
    );

    const failed = result.current.visibleMessages.find((m) => m.text === 'did not go')!;
    act(() => result.current.retry(failed));
    await waitFor(() => expect(harness.mutations.SendStaffMessage).toHaveBeenCalledTimes(3));
    // The pending row is dropped once the retry lands, which is a state update
    // AFTER the call — asserting it straight off the call count made this flaky.
    await waitFor(() =>
      expect(result.current.visibleMessages.find((m) => m.text === 'did not go')).toBeUndefined()
    );
  });

  it('leaves a still-pending message untouched when a different one in the outbox fails', async () => {
    const { result } = mount();
    let resolveFirst: () => void = () => undefined;
    harness.mutations.SendStaffMessage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = () => resolve({ data: {} });
        })
    ).mockRejectedValueOnce(new Error('offline'));

    act(() => result.current.send('first, still going'));
    act(() => result.current.send('second, will fail'));

    await waitFor(() =>
      expect(result.current.visibleMessages.find((m) => m.text === 'second, will fail')?.failed).toBe(true)
    );
    const first = result.current.visibleMessages.find((m) => m.text === 'first, still going');
    expect(first?.pending).toBe(true);
    expect(first?.failed).toBeFalsy();

    await act(async () => {
      resolveFirst();
    });
  });

  it('re-sends a failed attachment with the file, not just the caption', async () => {
    const { result } = mount();
    act(() =>
      result.current.retry({
        id: 'pending-old',
        from_user_id: 'me',
        to_user_id: 'u1',
        text: '',
        attachment_url: 'https://cdn.duncit.com/roster.pdf',
        created_at: '2026-08-20T09:00:00.000Z',
        failed: true,
      })
    );
    await waitFor(() =>
      expect(harness.mutations.SendStaffMessage).toHaveBeenCalledWith({
        variables: expect.objectContaining({
          attachmentUrl: 'https://cdn.duncit.com/roster.pdf',
          attachmentName: '',
          attachmentType: '',
        }),
      })
    );
  });

  it('does nothing without a conversation open', () => {
    const { result } = mount({ peer: null });
    act(() => result.current.send('to nobody'));
    expect(harness.mutations.SendStaffMessage).not.toHaveBeenCalled();
  });
});

describe('attachFile', () => {
  it('uploads, then posts what came back with real byte progress', async () => {
    uploadMock.mockResolvedValue('https://ik.duncit.com/staff-chat/court.png');
    const { result } = mount();
    const file = new File(['png'], 'court.png', { type: 'image/png' });

    act(() => result.current.attachFile(file, [0.2, 0.9]));
    expect(result.current.uploadPct).toBe(0);

    await waitFor(() =>
      expect(harness.mutations.SendStaffMessage).toHaveBeenCalledWith({
        variables: expect.objectContaining({
          attachmentUrl: 'https://ik.duncit.com/staff-chat/court.png',
          attachmentName: 'court.png',
          attachmentType: 'image/png',
          attachmentPeaks: [0.2, 0.9],
        }),
      })
    );
    expect(result.current.uploadPct).toBeNull();
    expect(uploadMock).toHaveBeenCalledWith(file, '/staff-chat', expect.any(Function));
  });

  it('shows the upload failure instead of spinning forever', async () => {
    uploadMock.mockRejectedValue(new Error('ImageKit refused the file'));
    const { result } = mount();

    act(() => result.current.attachFile(new File(['x'], 'big.mp4', { type: 'video/mp4' })));
    await waitFor(() => expect(result.current.error?.message).toBe('ImageKit refused the file'));
    expect(result.current.uploadPct).toBeNull();
  });
});

describe('exportChat', () => {
  it('fetches the full call log and downloads the transcript', async () => {
    harness.data.StaffMessages = { staffMessages: [live('m1', 'hello', '2026-08-20T09:00:00Z')] };
    harness.client.query = vi.fn().mockResolvedValue({ data: { staffCalls: [{ id: 'c1' }] } });
    const { result } = mount({ meName: undefined });

    await act(() => result.current.exportChat());
    expect(exporter.build).toHaveBeenCalledWith({
      me: { id: 'me', name: 'You' },
      peer: asha,
      messages: [expect.objectContaining({ id: 'm1' })],
      calls: [{ id: 'c1' }],
    });
    expect(exporter.download).toHaveBeenCalledWith('EXPORT', 'Asha Rao');
  });

  it('does nothing without a peer', async () => {
    const { result } = mount({ peer: null });
    await act(() => result.current.exportChat());
    expect(exporter.download).not.toHaveBeenCalled();
  });

  it('exports an empty transcript rather than throwing when neither query has answered yet', async () => {
    harness.client.query = vi.fn().mockResolvedValue({ data: {} });
    const { result } = mount();

    await act(() => result.current.exportChat());

    expect(exporter.build).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], calls: [] })
    );
  });
});

describe('history paging', () => {
  it('pages by created_at cursor and stops when a page comes back short', async () => {
    harness.data.StaffMessages = { staffMessages: [live('m2', 'later', '2026-08-20T10:00:00Z')] };
    harness.client.query = vi
      .fn()
      .mockResolvedValue({ data: { staffMessages: [live('m1', 'earlier', '2026-08-20T09:00:00Z'), live('m2', 'later', '2026-08-20T10:00:00Z')] } });
    const { result } = mount();
    expect(result.current.hasMore).toBe(true);

    await act(() => result.current.loadOlder());
    expect(harness.client.query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { peerId: 'u1', limit: 50, before: '2026-08-20T10:00:00Z' },
      })
    );
    // The short page marks the start; the duplicate row is not shown twice.
    expect(result.current.hasMore).toBe(false);
    expect(result.current.visibleMessages.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('leaves the thread alone when the page fails, so the button can retry', async () => {
    harness.data.StaffMessages = { staffMessages: [live('m2', 'later', '2026-08-20T10:00:00Z')] };
    harness.client.query = vi.fn().mockRejectedValue(new Error('offline'));
    const { result } = mount();

    await act(() => result.current.loadOlder());
    expect(result.current.loadingMore).toBe(false);
    expect(result.current.visibleMessages).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);
  });

  it('asks for nothing when there is nothing on screen to page before', async () => {
    const { result } = mount();
    await act(() => result.current.loadOlder());
    expect(harness.client.query).not.toHaveBeenCalled();
  });

  it('treats an empty answer as a short page rather than throwing', async () => {
    harness.data.StaffMessages = { staffMessages: [live('m2', 'later', '2026-08-20T10:00:00Z')] };
    harness.client.query = vi.fn().mockResolvedValue({ data: {} });
    const { result } = mount();

    await act(() => result.current.loadOlder());

    expect(result.current.hasMore).toBe(false);
    expect(result.current.visibleMessages).toHaveLength(1);
  });
});

describe('changing and clearing', () => {
  it('runs a message change, then re-reads the thread', async () => {
    const { result } = mount();
    act(() => result.current.change(result.current.mutations.editMessage, { id: 'm1', text: 'x' }));
    await waitFor(() =>
      expect(harness.mutations.EditStaffMessage).toHaveBeenCalledWith({ variables: { id: 'm1', text: 'x' } })
    );
    await waitFor(() => expect(harness.queries.StaffMessages.refetch).toHaveBeenCalled());
  });

  it('swallows a failed change — the thread simply does not move', async () => {
    const { result } = mount();
    act(() => result.current.change(result.current.mutations.editMessage, { id: 'm1', text: 'x' }));
    await waitFor(() => expect(harness.mutations.EditStaffMessage).toHaveBeenCalled());
    harness.mutations.EditStaffMessage.mockRejectedValueOnce(new Error('gone'));
    act(() => result.current.change(result.current.mutations.editMessage, { id: 'm2', text: 'y' }));
    await waitFor(() => expect(harness.mutations.EditStaffMessage).toHaveBeenCalledTimes(2));
    expect(result.current.error).toBeNull();
  });

  it('clears the conversation for both people and resets the local history', async () => {
    harness.data.StaffMessages = { staffMessages: [live('m1', 'old', '2026-08-20T09:00:00Z')] };
    const { result } = mount();

    act(() => result.current.clearConversation());
    await waitFor(() =>
      expect(harness.mutations.ClearStaffThread).toHaveBeenCalledWith({ variables: { peerId: 'u1' } })
    );
    await waitFor(() => expect(result.current.hasMore).toBe(false));
  });

  it('surfaces a failed clear instead of quietly keeping the messages', async () => {
    const { result } = mount();
    // Prime the registry so the reject targets the right mutation.
    act(() => result.current.clearConversation());
    await waitFor(() => expect(harness.mutations.ClearStaffThread).toHaveBeenCalled());
    harness.mutations.ClearStaffThread.mockRejectedValueOnce(new Error('not allowed'));
    act(() => result.current.clearConversation());
    await waitFor(() => expect(result.current.error?.message).toBe('not allowed'));
  });

  it('ignores a clear with no conversation open', () => {
    const { result } = mount({ peer: null });
    act(() => result.current.clearConversation());
    expect(harness.mutations.ClearStaffThread).not.toHaveBeenCalled();
  });

  it('hides a message on this device only', async () => {
    harness.data.StaffMessages = { staffMessages: [live('m1', 'keep', '2026-08-20T09:00:00Z')] };
    const { result } = mount();
    expect(result.current.visibleMessages).toHaveLength(1);
    act(() => result.current.hideForMe('m1'));
    await waitFor(() => expect(result.current.visibleMessages).toHaveLength(0));
  });
});

describe('presence and names', () => {
  it('prefers the live socket status, then the snapshot, then OFFLINE', () => {
    presenceState.others = { u1: 'AWAY' };
    harness.data.StaffPresence = {
      staffPresence: [
        { user_id: 'u1', status: 'ONLINE' },
        { user_id: 'u2', status: 'BUSY', last_seen: '2026-08-20T08:00:00Z' },
      ],
    };
    const { result } = mount();
    expect(result.current.statusOf('u1')).toBe('AWAY');
    expect(result.current.statusOf('u2')).toBe('BUSY');
    expect(result.current.statusOf('u9')).toBe('OFFLINE');
  });

  it('answers last-seen the same two-source way', () => {
    presenceState.lastSeen = { u1: '2026-08-20T09:30:00Z' };
    harness.data.StaffPresence = {
      staffPresence: [{ user_id: 'u2', status: 'OFFLINE', last_seen: '2026-08-19T18:00:00Z' }],
    };
    const { result } = mount();
    expect(result.current.lastSeenOf('u1')).toBe('2026-08-20T09:30:00Z');
    expect(result.current.lastSeenOf('u2')).toBe('2026-08-19T18:00:00Z');
    expect(result.current.lastSeenOf('u9')).toBeNull();
  });

  it('names me, the peer, and anyone else', () => {
    const { result } = mount();
    expect(result.current.nameOf('me')).toBe('You');
    expect(result.current.nameOf('u1')).toBe('Asha Rao');
    expect(result.current.nameOf('u9')).toBe('Someone');
  });
});

describe('socket wiring', () => {
  it('marks the open conversation read on arrival', async () => {
    mount();
    await waitFor(() =>
      expect(harness.mutations.MarkStaffThreadRead).toHaveBeenCalledWith({ variables: { peerId: 'u1' } })
    );
  });

  it('re-reads the open thread only for a message on this line', async () => {
    mount();
    const before = harness.queries.StaffMessages.refetch.mock.calls.length;
    act(() => {
      socketSeen.onMessage?.({ from_user_id: 'u1', to_user_id: 'me' });
    });
    await waitFor(() =>
      expect(harness.queries.StaffMessages.refetch.mock.calls.length).toBe(before + 1)
    );

    act(() => {
      socketSeen.onMessage?.({ from_user_id: 'u7', to_user_id: 'u8' });
    });
    // Unrelated traffic refreshes the lists, never the open thread.
    expect(harness.queries.StaffMessages.refetch.mock.calls.length).toBe(before + 1);
    expect(harness.queries.StaffThreads.refetch).toHaveBeenCalled();
  });

  it('hands back a stable empty ICE list until the platform answers', () => {
    const { result } = mount();
    expect(result.current.iceServers).toEqual([]);
    expect(result.current.uploading).toBe(false);
  });
});
