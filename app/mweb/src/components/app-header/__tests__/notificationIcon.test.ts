import { describe, expect, it } from 'vitest';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import { notificationCategory, notificationIcon } from '../notificationIcon';

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
    expect(notificationCategory(null)).toBe('general');
    expect(notificationCategory(undefined)).toBe('general');
  });
});

describe('notificationIcon', () => {
  it('maps categories to their MUI icon component', () => {
    expect(notificationIcon('New 5★ feedback on "Jam"')).toBe(StarIcon);
    expect(notificationIcon('New follower')).toBe(PersonIcon);
    expect(notificationIcon('Hello there')).toBe(NotificationsActiveIcon);
  });
});
