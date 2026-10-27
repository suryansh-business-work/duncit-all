import { describe, expect, it } from 'vitest';
import type { LiteRegistrationStatus } from '../../../../shared/graphql/documents';
import { registrationView, spotsLeft } from '../../../pages/event/registrationView';
import { eventFixture, registrationFixture, statsFixture } from '../../test-utils';

/** The fixture event ends 21 Nov 2026 16:00 UTC; "now" is a week before unless a test moves it. */
const BEFORE_END = new Date('2026-11-14T12:00:00.000Z');
const AFTER_END = new Date('2026-11-21T16:00:01.000Z');

const held = (status: LiteRegistrationStatus) => eventFixture({ viewer_registration: registrationFixture({ status }) });

describe('registrationView', () => {
  it('reads a published, open, future event with no registration as OPEN', () => {
    expect(registrationView(eventFixture(), BEFORE_END)).toBe('OPEN');
  });

  it('says CANCELLED_EVENT for a cancelled event, even when the viewer held a place', () => {
    expect(registrationView(eventFixture({ status: 'CANCELLED' }), BEFORE_END)).toBe('CANCELLED_EVENT');
    expect(registrationView({ ...held('CONFIRMED'), status: 'CANCELLED' }, BEFORE_END)).toBe('CANCELLED_EVENT');
  });

  it('says DRAFT for an unpublished event', () => {
    expect(registrationView(eventFixture({ status: 'DRAFT' }), BEFORE_END)).toBe('DRAFT');
  });

  it.each<LiteRegistrationStatus>(['CONFIRMED', 'PAYMENT_PENDING', 'PENDING_APPROVAL', 'WAITLISTED'])(
    'keeps showing a held %s place after the event ended and registration closed',
    (status) => {
      const event = { ...held(status), registration_open: false };
      expect(registrationView(event, AFTER_END)).toBe(status);
    },
  );

  it.each<LiteRegistrationStatus>(['DECLINED', 'CANCELLED'])('treats a %s registration as no place at all', (status) => {
    expect(registrationView(held(status), BEFORE_END)).toBe('OPEN');
    expect(registrationView(held(status), AFTER_END)).toBe('ENDED');
  });

  it('says ENDED once the end has passed, before looking at registration', () => {
    expect(registrationView(eventFixture({ registration_open: false }), AFTER_END)).toBe('ENDED');
  });

  it('is not ENDED at the exact end instant (the end must be strictly in the past)', () => {
    expect(registrationView(eventFixture(), new Date('2026-11-21T16:00:00.000Z'))).toBe('OPEN');
  });

  it('says REGISTRATION_CLOSED when the host closed registration on a future event', () => {
    expect(registrationView(eventFixture({ registration_open: false }), BEFORE_END)).toBe('REGISTRATION_CLOSED');
  });
});

describe('spotsLeft', () => {
  it('is null when the host set no capacity', () => {
    expect(spotsLeft(eventFixture({ capacity: null, stats: statsFixture({ going: 40 }) }))).toBeNull();
  });

  it('is the capacity minus the guests going', () => {
    expect(spotsLeft(eventFixture({ capacity: 10, stats: statsFixture({ going: 3 }) }))).toBe(7);
  });

  it('is zero when the event is exactly full', () => {
    expect(spotsLeft(eventFixture({ capacity: 5, stats: statsFixture({ going: 5 }) }))).toBe(0);
  });

  it('never goes negative when more are going than the capacity allows', () => {
    expect(spotsLeft(eventFixture({ capacity: 5, stats: statsFixture({ going: 8 }) }))).toBe(0);
  });
});
