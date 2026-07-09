import { notificationCategory, notificationIconName } from '@/utils/notification-icon';

describe('notificationCategory', () => {
  it('classifies each notification type from its title', () => {
    expect(notificationCategory('Refund processed to your wallet')).toBe('payment');
    expect(notificationCategory('New 5★ feedback on "Jam"')).toBe('review');
    expect(notificationCategory('Onboarding meeting scheduled')).toBe('meeting');
    expect(notificationCategory('Venue approved your slot')).toBe('approval');
    expect(notificationCategory('New slot booking request')).toBe('request');
    expect(notificationCategory('Congratulations! 🎉')).toBe('achievement');
    expect(notificationCategory('🚨 SOS TCK-1 from Sam')).toBe('support');
    expect(notificationCategory('Your club was published')).toBe('club');
    expect(notificationCategory('Your pod is now live')).toBe('pod');
    expect(notificationCategory('New follower')).toBe('account');
  });

  it('falls back to general for an unmatched or empty title', () => {
    expect(notificationCategory('Hello there')).toBe('general');
    expect(notificationCategory('')).toBe('general');
    expect(notificationCategory(undefined)).toBe('general');
    expect(notificationCategory(null)).toBe('general');
  });
});

describe('notificationIconName', () => {
  it('maps every category to its MaterialIcons glyph', () => {
    expect(notificationIconName('Refund processed to your wallet')).toBe('payment');
    expect(notificationIconName('New 5★ feedback on "Jam"')).toBe('star');
    expect(notificationIconName('Onboarding meeting scheduled')).toBe('event');
    expect(notificationIconName('Venue approved your slot')).toBe('check-circle');
    expect(notificationIconName('New slot booking request')).toBe('markunread-mailbox');
    expect(notificationIconName('Congratulations! 🎉')).toBe('celebration');
    expect(notificationIconName('🚨 SOS TCK-1 from Sam')).toBe('chat');
    expect(notificationIconName('Your club was published')).toBe('account-balance');
    expect(notificationIconName('Your pod is now live')).toBe('mic');
    expect(notificationIconName('New follower')).toBe('person');
    expect(notificationIconName('Hello there')).toBe('notifications-active');
  });
});
