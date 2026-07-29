import { describe, expect, it } from 'vitest';

import {
  ALREADY_ENABLED_LABEL,
  EARN_JOURNEYS,
  IN_PROCESS_LABEL,
  MEETING_SCHEDULED_LABEL,
  PARTNER_PORTAL_URL,
  earnBoxState,
  meetingNotice,
  partnerPortalUrl,
  type EarnJourney,
  type EarnMeeting,
} from '../src';

const HOST = EARN_JOURNEYS[0] as EarnJourney;

const meeting = (over: Partial<EarnMeeting> = {}): EarnMeeting => ({
  id: 'm1',
  kind: 'HOST',
  status: 'SCHEDULED',
  ...over,
});

describe('EARN_JOURNEYS', () => {
  it('ships the four journeys in display order with distinct roles and kinds', () => {
    expect(EARN_JOURNEYS.map((j) => j.kind)).toEqual(['HOST', 'VENUE', 'ECOMM', 'CLUB_ADMIN']);
    expect(new Set(EARN_JOURNEYS.map((j) => j.role)).size).toBe(4);
    expect(EARN_JOURNEYS.map((j) => j.iconKey)).toEqual(['host', 'venue', 'ecomm', 'club']);
  });

  it('gives every journey both a survey path and a native route', () => {
    for (const journey of EARN_JOURNEYS) {
      expect(journey.surveyPath.startsWith('/survey/')).toBe(true);
      expect(journey.nativeRoute).not.toBe('');
      expect(journey.cta.label).not.toBe('');
    }
  });

  it('builds an absolute partner-portal URL', () => {
    expect(partnerPortalUrl('/ecomm-brand')).toBe(`${PARTNER_PORTAL_URL}/ecomm-brand`);
  });
});

describe('meetingNotice', () => {
  it('names the request id so the user can quote it to support', () => {
    expect(meetingNotice(meeting({ request_no: 'DUN-MTG-000007' }))).toContain(
      '(Request ID: DUN-MTG-000007)',
    );
  });

  it('falls back to the requested time when nothing is scheduled yet', () => {
    const text = meetingNotice(meeting({ scheduled_at: null, requested_at: '2026-08-01T09:00:00Z' }));
    expect(text).toMatch(/scheduled for this on /);
  });

  it('omits the time entirely when neither timestamp exists', () => {
    const text = meetingNotice(meeting({ scheduled_at: null, requested_at: null }));
    expect(text).toContain('scheduled for this.');
    expect(text).not.toContain(' on ');
  });
});

describe('earnBoxState', () => {
  it('locks a journey the user already holds, and marks it approved', () => {
    const state = earnBoxState(HOST, ['HOST'], []);
    expect(state).toMatchObject({
      disabled: true,
      disabledLabel: ALREADY_ENABLED_LABEL,
      approved: true,
      description: HOST.description,
    });
    expect(state.scheduledMeeting).toBeUndefined();
  });

  it('holding the role wins over an old meeting row', () => {
    const state = earnBoxState(HOST, ['HOST'], [meeting({ status: 'DONE' })]);
    expect(state.approved).toBe(true);
    expect(state.disabledLabel).toBe(ALREADY_ENABLED_LABEL);
  });

  it.each(['REQUESTED', 'SCHEDULED'])('blocks on an open %s meeting and exposes it', (status) => {
    const open = meeting({ status, request_no: 'DUN-MTG-000001' });
    const state = earnBoxState(HOST, [], [open]);
    expect(state.disabled).toBe(true);
    expect(state.disabledLabel).toBe(MEETING_SCHEDULED_LABEL);
    expect(state.scheduledMeeting).toBe(open);
    expect(state.description).toContain('DUN-MTG-000001');
  });

  it.each([undefined, 'NONE', 'PENDING'])(
    'keeps a DONE meeting locked while approval is %s',
    (approval_status) => {
      const state = earnBoxState(HOST, [], [meeting({ status: 'DONE', approval_status })]);
      expect(state.disabled).toBe(true);
      expect(state.disabledLabel).toBe(IN_PROCESS_LABEL);
      expect(state.approved).toBe(false);
    },
  );

  it.each(['DRAFT', 'SUBMITTED'])(
    'keeps an approved meeting locked while the record is %s',
    (onboarded_status) => {
      const state = earnBoxState(
        HOST,
        [],
        [meeting({ status: 'DONE', approval_status: 'APPROVED', onboarded_status })],
      );
      expect(state.disabled).toBe(true);
      expect(state.disabledLabel).toBe(IN_PROCESS_LABEL);
    },
  );

  it('re-opens the journey once the onboarded record is rejected', () => {
    const state = earnBoxState(
      HOST,
      [],
      [meeting({ status: 'DONE', approval_status: 'APPROVED', onboarded_status: 'REJECTED' })],
    );
    expect(state.disabled).toBe(false);
    expect(state.approved).toBe(false);
    expect(state.description).toBe(HOST.description);
  });

  it('re-opens the journey when an approved meeting has no onboarded record yet', () => {
    // Approved, but the user never started the partner form — nothing is under
    // review, so the journey must stay open rather than lock forever.
    const state = earnBoxState(HOST, [], [meeting({ status: 'DONE', approval_status: 'APPROVED' })]);
    expect(state.disabled).toBe(false);
  });

  it('re-opens the journey when the meeting was denied outright', () => {
    const state = earnBoxState(HOST, [], [meeting({ status: 'DONE', approval_status: 'REJECTED' })]);
    expect(state.disabled).toBe(false);
  });

  it('ignores meetings booked for a different journey', () => {
    const state = earnBoxState(HOST, [], [meeting({ kind: 'VENUE', status: 'SCHEDULED' })]);
    expect(state.disabled).toBe(false);
  });

  it('is open for a user with no roles and no meetings', () => {
    expect(earnBoxState(HOST, [], [])).toMatchObject({ disabled: false, approved: false });
  });

  it('treats a cancelled meeting as no blocker', () => {
    const state = earnBoxState(HOST, [], [meeting({ status: 'CANCELLED' })]);
    expect(state.disabled).toBe(false);
  });
});
