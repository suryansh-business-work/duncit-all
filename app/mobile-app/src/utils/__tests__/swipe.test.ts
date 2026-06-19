import { resolveSwipe } from '@/utils/swipe';

describe('resolveSwipe', () => {
  it('returns "next" for a leftward swipe past the threshold', () => {
    expect(resolveSwipe(-60)).toBe('next');
  });
  it('returns "prev" for a rightward swipe past the threshold', () => {
    expect(resolveSwipe(60)).toBe('prev');
  });
  it('returns null for movement shorter than the threshold (a tap)', () => {
    expect(resolveSwipe(10)).toBeNull();
    expect(resolveSwipe(-10)).toBeNull();
  });
  it('honours a custom threshold', () => {
    expect(resolveSwipe(-30, 20)).toBe('next');
    expect(resolveSwipe(-30, 40)).toBeNull();
  });
});
