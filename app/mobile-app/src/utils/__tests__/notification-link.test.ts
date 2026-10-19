import { resolveNotificationLink } from '@/utils/notification-link';

describe('resolveNotificationLink', () => {
  it('returns none for an empty/nullish link', () => {
    expect(resolveNotificationLink(null)).toEqual({ kind: 'none' });
    expect(resolveNotificationLink(undefined)).toEqual({ kind: 'none' });
    expect(resolveNotificationLink('')).toEqual({ kind: 'none' });
  });

  it('treats http(s) links as external', () => {
    expect(resolveNotificationLink('https://duncit.com/x')).toEqual({
      kind: 'external',
      url: 'https://duncit.com/x',
    });
  });

  it('routes a /post/:id link to the post target (stripping query/hash)', () => {
    expect(resolveNotificationLink('/post/abc123')).toEqual({ kind: 'post', postId: 'abc123' });
    expect(resolveNotificationLink('/post/abc123?ref=push')).toEqual({
      kind: 'post',
      postId: 'abc123',
    });
  });

  it('does not treat a bare /post path (no id) as a post', () => {
    expect(resolveNotificationLink('/post/')).toEqual({ kind: 'none' });
  });

  it('routes a /pod-requests/:id link to the Pod Request target (stripping query/hash)', () => {
    expect(resolveNotificationLink('/pod-requests/r1')).toEqual({ kind: 'podRequest', id: 'r1' });
    expect(resolveNotificationLink('/pod-requests/r1?from=push#top')).toEqual({
      kind: 'podRequest',
      id: 'r1',
    });
    // No id → not a Pod Request link.
    expect(resolveNotificationLink('/pod-requests/')).toEqual({ kind: 'none' });
  });

  it('maps a known param-less path to its screen', () => {
    expect(resolveNotificationLink('/earn')).toEqual({ kind: 'screen', route: 'Earn' });
  });

  it('returns none for an unrecognised in-app path', () => {
    expect(resolveNotificationLink('/unknown')).toEqual({ kind: 'none' });
  });

  it('opens the room a chat push names — a pod room or a club room', () => {
    expect(resolveNotificationLink('/chats/p1')).toEqual({
      kind: 'chat',
      room: { kind: 'POD', id: 'p1' },
    });
    expect(resolveNotificationLink('/chats/club/c1')).toEqual({
      kind: 'chat',
      room: { kind: 'CLUB', id: 'c1' },
    });
    // The Chats list itself is not a room.
    expect(resolveNotificationLink('/chats')).toEqual({ kind: 'none' });
  });

  it('opens Live Chat for a support reply push', () => {
    expect(resolveNotificationLink('/support/live')).toEqual({ kind: 'screen', route: 'LiveChat' });
  });
});
