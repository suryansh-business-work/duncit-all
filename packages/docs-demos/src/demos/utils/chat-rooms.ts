import {
  createChatPingGate,
  filterMentionCandidates,
  formatUnreadBadge,
  isChatMuted,
  mentionHandle,
  mentionIdsInText,
  mentionTarget,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';

interface MentionMock {
  members: { user_id: string; full_name: string }[];
  selfId: string;
  query: string;
  text: string;
}

interface AlertMock {
  /** Milliseconds after the first message at which each message lands. */
  arrivals: { id: string; at: number }[];
  windowMs: number;
  mutes: { label: string; is_muted: boolean; muted_until: string | null }[];
  unread: number[];
}

export const chatRoomDemos: PackageDemo[] = [
  defineDemo<MentionMock>({
    id: 'chat-mentions',
    title: 'Who the @ list offers, and which ids a message sends',
    note:
      'Change the query to see who the composer offers (never the writer). Edit the text: a member picked from the list but whose @handle was then deleted is not sent, so nobody is told about a mention they cannot see.',
    mock: {
      members: [
        { user_id: 'u1', full_name: 'Asha Rao' },
        { user_id: 'u2', full_name: 'Ravi Kumar' },
        { user_id: 'u3', full_name: 'Arjun Mehta' },
        { user_id: 'me', full_name: 'Amit Shah' },
      ],
      selfId: 'me',
      query: 'a',
      text: 'See you at 7 @Asha and @Ravi',
    },
    compute: (mock) => ({
      offered: filterMentionCandidates(mock.members, mock.query, mock.selfId)
        .map((m) => `${m.full_name} → @${mentionHandle(m.full_name)}`)
        .join(', '),
      sentMentions: mentionIdsInText(mock.text, mock.members).join(', ') || 'none',
      tapOnAtRavi: mentionTarget('@Ravi', mock.members) ?? 'nobody',
    }),
  }),
  defineDemo<AlertMock>({
    id: 'chat-alerts',
    title: 'One ping per burst, mute state and the unread badge',
    note:
      'Move the arrival times: inside the window only the first message pings. A mute with no end lasts until it is undone; a timed one ends on its own.',
    mock: {
      arrivals: [
        { id: 'm1', at: 0 },
        { id: 'm2', at: 400 },
        { id: 'm2', at: 900 },
        { id: 'm3', at: 3500 },
      ],
      windowMs: 3000,
      mutes: [
        { label: 'Always', is_muted: true, muted_until: null },
        { label: 'Ended yesterday', is_muted: true, muted_until: '2020-01-01T00:00:00Z' },
        { label: 'Not muted', is_muted: false, muted_until: null },
      ],
      unread: [0, 4, 120],
    },
    compute: (mock) => {
      let now = 0;
      const gate = createChatPingGate(mock.windowMs, () => now);
      const pings = mock.arrivals.map((a) => {
        now = a.at;
        return `${a.id}@${a.at}ms ${gate(a.id) ? 'pings' : 'silent'}`;
      });
      return {
        pings: pings.join(' · '),
        ...Object.fromEntries(mock.mutes.map((m) => [m.label, isChatMuted(m) ? 'muted' : 'alerts'])),
        badges: mock.unread.map((n) => `${n} → "${formatUnreadBadge(n)}"`).join(' · '),
      };
    },
  }),
];
