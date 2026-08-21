import { describe, expect, it } from 'vitest';
import {
  NOTIFICATION_CATEGORY_LABEL,
  NOTIFICATION_CATEGORY_ORDER,
  matchesNotificationFilter,
  notificationCategory,
  notificationChips,
  type NotificationCategory,
} from '../src/notification-category';

/**
 * One server-shaped title per category. Each carries tokens of its OWN
 * category (or a later one) only, so two of them can be glued together to
 * probe which rule wins without a third category sneaking in.
 */
const SAMPLE_TITLE: Record<NotificationCategory, string> = {
  payment: 'Payment successful',
  review: 'New review posted',
  meeting: 'Meeting scheduled',
  approval: 'Venue listing approved',
  request: 'Booking request received',
  achievement: 'Milestone unlocked',
  support: 'Support ticket updated',
  club: 'You joined a club',
  pod: 'Pod starts in 1 hour',
  post: 'New like on your post',
  account: 'New follower',
  general: 'Terms updated',
};

describe('notificationCategory', () => {
  it("files each producer's title under its own category", () => {
    for (const category of NOTIFICATION_CATEGORY_ORDER) {
      expect(notificationCategory(SAMPLE_TITLE[category])).toBe(category);
    }
  });

  it('ignores the casing the producer happened to use', () => {
    expect(notificationCategory('PAYMENT RECEIVED')).toBe('payment');
    expect(notificationCategory('Refund Issued')).toBe('payment');
    expect(notificationCategory('SUPPORT TICKET CLOSED')).toBe('support');
  });

  // Tokens are stems on purpose ("reschedul", "congrat", "unlock"): the
  // producers inflect them, and the rule still has to catch every form. Each
  // title here carries ONLY the stem — no whole token of any category — so a
  // whole-word matcher would file all three under "general".
  it('matches a token stem inside an inflected word', () => {
    expect(notificationCategory('Rescheduled to 6 pm')).toBe('meeting');
    expect(notificationCategory('Congratulations!')).toBe('achievement');
    expect(notificationCategory('Unlocked: early access')).toBe('achievement');
  });

  // "Appears in the lowercased title" means anywhere, not at a word start:
  // "paid" inside "prepaid" is still a payment signal.
  it('matches a token in the middle of a word, not only at its start', () => {
    expect(notificationCategory('Prepaid balance topped up')).toBe('payment');
  });

  it('reads the currency, star and party symbols as category signals', () => {
    expect(notificationCategory('₹500 credited to you')).toBe('payment');
    expect(notificationCategory('★★★★★ from Asha')).toBe('review');
    expect(notificationCategory('🎉 You did it')).toBe('achievement');
  });

  // The list is ordered by how specific each rule is: money and reviews are
  // named before the pod or club they are about, so a payment notification
  // never drowns in the "Pods" chip.
  it('lets the earlier rule win when a title matches several categories', () => {
    expect(notificationCategory('Pod payment received')).toBe('payment');
    expect(notificationCategory('Feedback on your club meeting')).toBe('review');
    expect(notificationCategory('Club meeting confirmed')).toBe('meeting');
    expect(notificationCategory('Follow request accepted')).toBe('approval');
    expect(notificationCategory('Review request for your pod')).toBe('review');
    expect(notificationCategory('Support chat about your pod')).toBe('support');
    expect(notificationCategory('Community event this weekend')).toBe('club');
    expect(notificationCategory('Pod session for your profile')).toBe('pod');
  });

  it('ranks the rules in exactly the chip order', () => {
    const real = NOTIFICATION_CATEGORY_ORDER.filter((c) => c !== 'general');
    for (const [i, earlier] of real.entries()) {
      for (const later of real.slice(i + 1)) {
        const title = `${SAMPLE_TITLE[later]} — ${SAMPLE_TITLE[earlier]}`;
        expect(notificationCategory(title)).toBe(earlier);
      }
    }
  });

  it('falls back to "general" for a title that matches nothing', () => {
    expect(notificationCategory('Terms updated')).toBe('general');
    expect(notificationCategory('')).toBe('general');
  });

  it('treats a missing title as "general" rather than crashing', () => {
    expect(notificationCategory(null)).toBe('general');
    expect(notificationCategory(undefined)).toBe('general');
  });
});

describe('NOTIFICATION_CATEGORY_ORDER', () => {
  it('lists every labelled category exactly once', () => {
    const keys = Object.keys(NOTIFICATION_CATEGORY_LABEL).toSorted((a, b) => a.localeCompare(b));
    expect(NOTIFICATION_CATEGORY_ORDER.toSorted((a, b) => a.localeCompare(b))).toEqual(keys);
    expect(new Set(NOTIFICATION_CATEGORY_ORDER).size).toBe(NOTIFICATION_CATEGORY_ORDER.length);
  });

  // This is the chip strip the user sees AND the classification priority: money
  // leads, the things a notification is "about" (club, pod, account) trail the
  // things that happened to them, and the catch-all closes the strip.
  it('runs from the most specific rule to the catch-all — money first, Other last', () => {
    expect(NOTIFICATION_CATEGORY_ORDER).toEqual([
      'payment',
      'review',
      'meeting',
      'approval',
      'request',
      'achievement',
      'support',
      'club',
      'pod',
      'post',
      'account',
      'general',
    ]);
  });
});

describe('NOTIFICATION_CATEGORY_LABEL', () => {
  it('gives every category a distinct, non-empty chip label', () => {
    const labels = NOTIFICATION_CATEGORY_ORDER.map((c) => NOTIFICATION_CATEGORY_LABEL[c]);
    for (const label of labels) expect(label.trim().length).toBeGreaterThan(0);
    expect(new Set(labels).size).toBe(labels.length);
  });

  // The chip cannot name what it could not classify — it must not pretend to.
  it('calls the catch-all "Other"', () => {
    expect(NOTIFICATION_CATEGORY_LABEL.general).toBe('Other');
  });
});

describe('notificationChips', () => {
  it('leads with an "All" chip counting every title, classified or not', () => {
    const chips = notificationChips(['Payment successful', null, 'Terms updated']);
    expect(chips[0]).toEqual({ key: 'all', label: 'All', count: 3 });
  });

  it('renders only the categories present, each with its own count', () => {
    expect(notificationChips(['Payment successful', 'Refund issued', 'New follower'])).toEqual([
      { key: 'all', label: 'All', count: 3 },
      { key: 'payment', label: 'Payments', count: 2 },
      { key: 'account', label: 'Account', count: 1 },
    ]);
  });

  it('orders chips by the category order, not by first appearance', () => {
    const chips = notificationChips(['New follower', 'Pod starts in 1 hour', 'Payment successful']);
    expect(chips.map((c) => c.key)).toEqual(['all', 'payment', 'pod', 'account']);
  });

  it('counts an untitled notification under "Other"', () => {
    expect(notificationChips([null, undefined, 'Terms updated'])).toEqual([
      { key: 'all', label: 'All', count: 3 },
      { key: 'general', label: 'Other', count: 3 },
    ]);
  });

  it('offers just the "All" chip for an empty list', () => {
    expect(notificationChips([])).toEqual([{ key: 'all', label: 'All', count: 0 }]);
  });
});

describe('matchesNotificationFilter', () => {
  it('lets every title through the "All" chip, even an untitled one', () => {
    expect(matchesNotificationFilter('Payment successful', 'all')).toBe(true);
    expect(matchesNotificationFilter(null, 'all')).toBe(true);
  });

  it('admits a title under the chip of its own category', () => {
    expect(matchesNotificationFilter('Payment successful', 'payment')).toBe(true);
    expect(matchesNotificationFilter('Terms updated', 'general')).toBe(true);
    expect(matchesNotificationFilter(undefined, 'general')).toBe(true);
  });

  it('keeps a title out of every other chip', () => {
    expect(matchesNotificationFilter('Payment successful', 'pod')).toBe(false);
    expect(matchesNotificationFilter(null, 'payment')).toBe(false);
  });

  // The filter and the chip counts are the same rule seen from two sides: a
  // chip that says "3" must reveal exactly three rows when tapped.
  it('agrees with the chip counts for every chip rendered', () => {
    const titles = [
      'Pod payment received',
      'New review posted',
      'Club meeting confirmed',
      'Pod starts in 1 hour',
      null,
      'Terms updated',
    ];
    const chips = notificationChips(titles);
    // Pin the strip first, so the loop below cannot pass on "All" alone.
    expect(chips.map((c) => c.key)).toEqual(['all', 'payment', 'review', 'meeting', 'pod', 'general']);
    for (const chip of chips) {
      expect(titles.filter((t) => matchesNotificationFilter(t, chip.key))).toHaveLength(chip.count);
    }
  });

  it('places every title under exactly one real chip', () => {
    for (const title of [...Object.values(SAMPLE_TITLE), null, '']) {
      const homes = NOTIFICATION_CATEGORY_ORDER.filter((key) => matchesNotificationFilter(title, key));
      expect(homes).toHaveLength(1);
    }
  });
});
