import type { RunAccount } from '../../support/run-account';
import { searchTable } from '../../support/tables';
import { countOperation, expectNotSent, expectTableEmpty, specMarker, wideViewport } from '../../support/ui-staff';
import {
  eq,
  findMeeting,
  meetingPath,
  onboardingAccount,
  openMeetingActions,
  openMeetingRow,
  productsVisible,
  releaseOnboarding,
  signInOnboarding,
  type MeetingKind,
  type MeetingRow,
} from '../../support/ui-onboarding';

/**
 * Onboarding · Meetings: the per-kind queues (/meetings/:kind), the calendar
 * (/meetings/calendar) and Meeting Availability (/meetings/availability).
 *
 * Every meeting here is a real applicant's and the availability is the one
 * grid every applicant books from, so nothing is scheduled, cancelled, marked
 * done, dismissed or saved: the dialogs are opened and stopped at their own
 * validation, with the mutation counted as never sent. The availability
 * scenario sends only values the server refuses before it writes
 * (meeting.service.ts updateAvailability: every guard throws before
 * `doc.save()`), and puts the stored grid back if a refusal ever goes missing.
 */

const TABLE = 'onboarding-meetings';
const MEETINGS = 'OnboardingMeetingsTable';

interface CalendarMeeting {
  id: string;
  status: string;
  dismissed: boolean | null;
  scheduled_at: string | null;
  requested_at: string;
  user_name: string | null;
  contact_name: string | null;
}

interface Availability {
  week_days: number[];
  start_time: string;
  end_time: string;
  slot_minutes: number;
  horizon_days: number;
}

const AVAILABILITY = `query E2eOnboardingAvailability {
  meetingAvailability { week_days start_time end_time slot_minutes horizon_days }
}`;
const RESTORE_AVAILABILITY = `mutation E2eOnboardingRestoreAvailability($input: MeetingAvailabilityInput!) {
  updateMeetingAvailability(input: $input) { id }
}`;
const HOLIDAYS = `query E2eOnboardingHolidays { meetingHolidays { id date name type } }`;

const monthLabel = (d: Date) => d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
const monthsFromNow = (d: Date) => {
  const now = new Date();
  return (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth();
};
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const eventStart = (m: CalendarMeeting) => new Date(m.scheduled_at ?? m.requested_at);

/** Month view, stepped from this month to the month of `day`. */
function monthViewAt(day: Date): void {
  cy.byTestId('meeting-calendar-view-month').click();
  const steps = monthsFromNow(day);
  for (let i = 0; i < Math.abs(steps); i += 1) cy.byTestId(steps > 0 ? 'meeting-calendar-next' : 'meeting-calendar-prev').click();
  cy.byTestId('meeting-calendar-range').should('have.text', monthLabel(day));
}

/** The calendar, and the meetings its query answered (dismissed ones are never drawn). */
function openCalendar(): Cypress.Chainable<CalendarMeeting[]> {
  cy.interceptOperation('OnboardingMeetings');
  cy.visitPortal('onboarding', '/meetings/calendar');
  return cy.wait('@OnboardingMeetings').then(({ response }) =>
    ((response?.body.data.onboardingMeetings ?? []) as CalendarMeeting[]).filter((m) => !m.dismissed),
  );
}

/** A drawn meeting that is not hidden behind "+N more" (a month cell draws three). */
function drawnMeeting(meetings: CalendarMeeting[], pick: (m: CalendarMeeting) => boolean, why: string): CalendarMeeting {
  const perDay = new Map<string, number>();
  for (const m of meetings) perDay.set(dayKey(eventStart(m)), (perDay.get(dayKey(eventStart(m))) ?? 0) + 1);
  const found = meetings.find((m) => pick(m) && (perDay.get(dayKey(eventStart(m))) ?? 0) <= 3);
  if (!found) throw new Error(`The calendar draws no ${why} meeting.`);
  return found;
}

describe('Onboarding · Meetings (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';
  let ecommOn = false;

  before(() => {
    account = onboardingAccount();
    marker = specMarker(account, 'onboarding-meetings');
    productsVisible().then((on) => {
      ecommOn = on;
    });
  });

  after(() => {
    releaseOnboarding(account);
  });

  beforeEach(() => {
    signInOnboarding(account);
  });

  // ------------------------------------------------------------ Queues

  it('OM-01 each kind queue is titled after its route kind, and an unknown kind reads "Unknown meeting kind."', () => {
    const kinds: [MeetingKind, string][] = [
      ['VENUE', 'Venue'],
      ['HOST', 'Host'],
      ['CLUB_ADMIN', 'Club Admin'],
    ];
    if (ecommOn) kinds.push(['ECOMM', 'E-Commerce Brand']);
    for (const [kind, label] of kinds) {
      cy.interceptOperation(MEETINGS);
      cy.visitPortal('onboarding', meetingPath(kind));
      cy.wait(`@${MEETINGS}`).its('request.body.variables.query.filters').should('deep.include', eq('kind', kind));
      cy.byTestId('meeting-schedule-title').should('have.text', `${label} Meeting Schedule`);
    }
    cy.visitPortal('onboarding', '/meetings/interview');
    cy.byTestId('meeting-schedule-unknown-kind').should('have.text', 'Unknown meeting kind.');
  });

  it('OM-02 the status toggle pins the server filter and the URL, a shared ?status= link opens filtered, and an unmatched search reads "No meetings for this filter."', () => {
    cy.interceptOperation(MEETINGS);
    cy.visitPortal('onboarding', '/meetings/host');
    cy.wait(`@${MEETINGS}`);
    cy.byTestId('meeting-status-ALL').should('have.attr', 'aria-pressed', 'true');

    cy.byTestId('meeting-status-SCHEDULED').click();
    cy.wait(`@${MEETINGS}`).its('request.body.variables.query.filters').should('deep.include', eq('status', 'SCHEDULED'));
    cy.location('search').should('eq', '?status=SCHEDULED');

    cy.byTestId('meeting-status-REJECTED').click();
    cy.wait(`@${MEETINGS}`).then(({ request }) => {
      const filters = request.body.variables.query.filters;
      expect(filters).to.deep.include(eq('status', 'CANCELLED'));
      expect(filters).to.deep.include({ field: 'cancelled_by_staff', op: 'is_true' });
    });
    cy.location('search').should('eq', '?status=REJECTED');

    cy.visitPortal('onboarding', '/meetings/host?status=DONE');
    cy.wait(`@${MEETINGS}`).its('request.body.variables.query.filters').should('deep.include', eq('status', 'DONE'));
    cy.byTestId('meeting-status-DONE').should('have.attr', 'aria-pressed', 'true');
    searchTable(MEETINGS, `${marker}-no-such-request`);
    expectTableEmpty('No meetings for this filter.');
  });

  it('OM-03 the requester link opens Requester details, and the row opens the meeting drawer', () => {
    findMeeting([], 'on record at all').then((row) => {
      openMeetingRow(row);
      cy.byTestId(`meeting-requester-${row.id}`).click();
      cy.byTestId('requester-dialog').should('contain.text', 'Requester details').and('contain.text', String(row.request_no));
      cy.get('body').type('{esc}');
      cy.byTestId('requester-dialog').should('not.exist');

      cy.byTestId(`${TABLE}-row-${row.id}`).click(24, 16);
      cy.byTestId('meeting-details-title').should('have.text', row.user_name || row.contact_name || 'Applicant');
    });
  });

  it('OM-04 a staff-rejected meeting shows its reason in the drawer, hides the meeting link and offers no action', () => {
    findMeeting([eq('status', 'CANCELLED'), { field: 'cancelled_by_staff', op: 'is_true' }], 'rejected by staff').then((row) => {
      openMeetingRow(row);
      cy.byTestId(`meeting-actions-none-${row.id}`).should('have.text', '—');
      cy.byTestId(`${TABLE}-row-${row.id}`).click(24, 16);
      cy.byTestId('meeting-details').should('contain.text', 'Rejected');
      if (row.cancel_reason) cy.byTestId('meeting-details').should('contain.text', row.cancel_reason);
      cy.byTestId('meeting-details-join').should('not.exist');
      cy.byTestId('meeting-details-schedule').should('not.exist');
      cy.byTestId('meeting-details-cancel').should('not.exist');
    });
  });

  it('OM-05 a requested meeting offers Schedule and Cancel; a scheduled one Reschedule, Mark done and Reject', () => {
    findMeeting([eq('status', 'REQUESTED')], 'requested').then((row) => {
      openMeetingRow(row);
      openMeetingActions(row);
      cy.byTestId('meeting-action-schedule').should('be.visible');
      cy.byTestId('meeting-action-cancel').should('be.visible');
      cy.byTestId('meeting-action-mark-done').should('not.exist');
      cy.get('body').type('{esc}');
    });
    findMeeting([eq('status', 'SCHEDULED')], 'scheduled').then((row) => {
      openMeetingRow(row);
      openMeetingActions(row);
      cy.byTestId('meeting-action-reschedule').should('be.visible');
      cy.byTestId('meeting-action-mark-done').should('be.visible');
      cy.byTestId('meeting-action-reject').should('be.visible');
      cy.byTestId('meeting-action-schedule').should('not.exist');
      cy.get('body').type('{esc}');
    });
  });

  it('OM-06 Schedule refuses to save without a meeting link, and Cancel closes without sending anything', () => {
    findMeeting([eq('status', 'REQUESTED')], 'requested').then((row: MeetingRow) => {
      const updates = countOperation('UpdateMeeting');
      openMeetingRow(row);
      openMeetingActions(row);
      cy.interceptOperation('StaffMeetingSlots');
      cy.byTestId('meeting-action-schedule').click();
      cy.wait('@StaffMeetingSlots');
      cy.byTestId('schedule-meeting-dialog').should('contain.text', 'Schedule meeting');
      cy.byTestId('schedule-meeting-link').find('input').clear();
      cy.byTestId('schedule-meeting-save').click();
      cy.byTestId('schedule-meeting-error').should('have.text', 'Add a meeting link to schedule the meeting.');
      cy.byTestId('schedule-meeting-link').find('input').should('have.attr', 'aria-invalid', 'true');
      cy.byTestId('schedule-meeting-cancel').click();
      cy.byTestId('schedule-meeting-dialog').should('not.exist');
      expectNotSent(updates, 'UpdateMeeting');
    });
  });

  it('OM-07 Cancel meeting needs a reason, and Keep meeting leaves the request as it was', () => {
    findMeeting([eq('status', 'REQUESTED')], 'requested').then((row) => {
      const cancels = countOperation('CancelMeeting');
      openMeetingRow(row);
      openMeetingActions(row);
      cy.byTestId('meeting-action-cancel').click();
      cy.byTestId('cancel-meeting-confirm').click();
      cy.byTestId('cancel-meeting-error').should(
        'have.text',
        'A cancellation reason is required — it is emailed to the applicant.',
      );
      cy.byTestId('cancel-meeting-reason').find('textarea').first().type('   ', { delay: 0 });
      cy.byTestId('cancel-meeting-confirm').click();
      cy.byTestId('cancel-meeting-error').should('be.visible');
      cy.byTestId('cancel-meeting-keep').click();
      cy.byTestId('cancel-meeting-dialog').should('not.exist');
      cy.byTestId(`${TABLE}-row-${row.id}`).should('contain.text', 'Requested');
      expectNotSent(cancels, 'CancelMeeting');
    });
  });

  // ------------------------------------------------------------ Calendar

  it('OM-08 the calendar opens on the week, Month shows this month’s Sun–Sat grid, and Previous / Next / Today step a month', () => {
    openCalendar();
    cy.byTestId('meeting-calendar-view-week').should('have.attr', 'aria-pressed', 'true');
    cy.byTestId('meeting-calendar-range').invoke('text').should('match', /^\d{1,2} \w{3} – \d{1,2} \w{3} \d{4}$/);

    const now = new Date();
    cy.byTestId('meeting-calendar-view-month').click();
    cy.byTestId('meeting-calendar-range').should('have.text', monthLabel(now));
    cy.byTestId('meeting-calendar-month').children().should(($cells) => {
      expect($cells.length % 7, 'whole Sun–Sat weeks').to.equal(0);
    });
    cy.byTestId(`meeting-calendar-day-${dayKey(now)}`).should('exist');

    cy.byTestId('meeting-calendar-next').click();
    cy.byTestId('meeting-calendar-range').should('have.text', monthLabel(new Date(now.getFullYear(), now.getMonth() + 1, 1)));
    cy.byTestId('meeting-calendar-prev').click();
    cy.byTestId('meeting-calendar-prev').click();
    cy.byTestId('meeting-calendar-range').should('have.text', monthLabel(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
    cy.byTestId('meeting-calendar-today').click();
    cy.byTestId('meeting-calendar-range').should('have.text', monthLabel(now));
  });

  it('OM-09 a meeting on the calendar opens a read-only drawer', () => {
    openCalendar().then((meetings) => {
      const meeting = drawnMeeting(meetings, () => true, 'single');
      monthViewAt(eventStart(meeting));
      cy.byTestId(`meeting-calendar-event-${meeting.id}`).click();
      cy.byTestId('meeting-details-title').should('have.text', meeting.user_name || meeting.contact_name || 'Applicant');
      cy.byTestId('meeting-details-schedule').should('not.exist');
      cy.byTestId('meeting-details-cancel').should('not.exist');
    });
  });

  it('OM-10 only a cancelled meeting can be removed from the calendar: the menu item is disabled on any other', () => {
    openCalendar().then((meetings) => {
      const meeting = drawnMeeting(meetings, (m) => m.status !== 'CANCELLED', 'non-cancelled');
      const dismissals = countOperation('DismissMeeting');
      monthViewAt(eventStart(meeting));
      cy.byTestId(`meeting-calendar-event-${meeting.id}`).rightclick();
      cy.byTestId('meeting-calendar-remove')
        .should('have.text', 'Only cancelled meetings can be removed')
        .and('have.attr', 'aria-disabled', 'true');
      cy.get('body').type('{esc}');
      cy.byTestId('meeting-calendar-remove').should('not.exist');
      expectNotSent(dismissals, 'DismissMeeting');
    });
  });

  it('OM-11 a holiday from Meeting Availability is marked on its calendar day', () => {
    cy.gql<{ meetingHolidays: { id: string; date: string; name: string | null; type: string }[] }>(HOLIDAYS).then(
      ({ meetingHolidays }) => {
        const [holiday] = meetingHolidays;
        if (!holiday) throw new Error('Staging has no onboarding holiday on Meeting Availability to show on the calendar.');
        const [y, m, d] = holiday.date.split('-').map(Number);
        openCalendar();
        monthViewAt(new Date(y, m - 1, d));
        cy.byTestId(`meeting-calendar-holiday-${holiday.date}`).should('be.visible');
        if (holiday.name) cy.byTestId(`meeting-calendar-holiday-${holiday.date}`).should('have.text', holiday.name);
      },
    );
  });

  // ------------------------------------------------------------ Availability

  it('OM-12 Meeting Availability shows the stored working days, slot length and booking horizon', () => {
    cy.interceptOperation('MeetingAvailability');
    cy.visitPortal('onboarding', '/meetings/availability');
    cy.wait('@MeetingAvailability').then(({ response }) => {
      const av = response?.body.data.meetingAvailability as Availability;
      for (let day = 0; day < 7; day += 1) {
        cy.byTestId(`availability-day-${day}`).find('input').should(av.week_days.includes(day) ? 'be.checked' : 'not.be.checked');
      }
      cy.byTestId('availability-slot-minutes').find('input').should('have.value', String(av.slot_minutes));
      cy.byTestId('availability-horizon-days').find('input').should('have.value', String(av.horizon_days));
    });
  });

  it('OM-13 the server refuses an impossible schedule — horizon, slot length, no working day — and the stored grid is unchanged', () => {
    cy.gql<{ meetingAvailability: Availability }>(AVAILABILITY).then(({ meetingAvailability: before }) => {
      wideViewport();
      cy.interceptOperation('MeetingAvailability');
      cy.visitPortal('onboarding', '/meetings/availability');
      cy.wait('@MeetingAvailability');

      /** Save, expect the refusal, and put the grid back if the server ever accepted it. */
      const saveRefused = (message: string) => {
        cy.interceptOperation('UpdateMeetingAvailability');
        cy.byTestId('availability-save').click();
        cy.wait('@UpdateMeetingAvailability').then(({ response }) => {
          if (!response?.body.errors) cy.gql(RESTORE_AVAILABILITY, { input: before });
          expect(response?.body.errors?.[0]?.message, 'the server refuses it').to.equal(message);
        });
        cy.byTestId('availability-error').should('have.text', message);
      };

      cy.byTestId('availability-horizon-days').find('input').clear().type('61', { delay: 0 });
      saveRefused('Booking horizon must be between 1 and 60 days');
      cy.byTestId('availability-horizon-days').find('input').clear().type(String(before.horizon_days), { delay: 0 });

      cy.byTestId('availability-slot-minutes').find('input').clear().type('5', { delay: 0 });
      saveRefused('Slot length must be between 10 and 240 minutes');
      cy.byTestId('availability-slot-minutes').find('input').clear().type(String(before.slot_minutes), { delay: 0 });

      for (const day of before.week_days) cy.byTestId(`availability-day-${day}`).find('input').uncheck();
      saveRefused('Pick at least one working day');

      cy.gql<{ meetingAvailability: Availability }>(AVAILABILITY).its('meetingAvailability').should('deep.equal', before);
    });
  });

  it('OM-14 the holidays list matches the server, and Add without a date asks for one without sending', () => {
    const adds = countOperation('AddMeetingHoliday');
    cy.interceptOperation('MeetingHolidays');
    cy.visitPortal('onboarding', '/meetings/availability');
    cy.wait('@MeetingHolidays').then(({ response }) => {
      const holidays = response?.body.data.meetingHolidays as { id: string }[];
      if (holidays.length === 0) cy.byTestId('meeting-holidays-empty').should('have.text', 'No holidays added yet.');
      for (const h of holidays) cy.byTestId(`meeting-holiday-${h.id}`).should('exist');
    });
    cy.byTestId('meeting-holidays-add').click();
    cy.byTestId('meeting-holidays-error').should('have.text', 'Pick a date for the holiday');
    expectNotSent(adds, 'AddMeetingHoliday');
  });
});
