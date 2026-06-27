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

  it('maps a known param-less path to its screen', () => {
    expect(resolveNotificationLink('/earn')).toEqual({ kind: 'screen', route: 'Earn' });
  });

  it('returns none for an unrecognised in-app path', () => {
    expect(resolveNotificationLink('/unknown')).toEqual({ kind: 'none' });
  });
});
