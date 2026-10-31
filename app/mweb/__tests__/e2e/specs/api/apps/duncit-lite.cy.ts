/// <reference types="cypress" />
import { expectRefused, type Refusal } from '../../../support/access-steps';
import { marked, refusal } from '../../../support/api-apps';
import type { GqlBody } from '../../../support/commands';
import { runAccount } from '../../../support/run-account';

/**
 * Duncit Lite (lite.duncit.com) — the run account's own life on Lite's API.
 * Scenario map: Apps › Duncit Lite - Sign In ("Sign in with an email code"),
 * Calendars and Profile, Hosting ("Create, publish, edit, duplicate an
 * event", "Manage guests … check in by code", "cancel event"), Registration
 * ("Register for a free event with questions", "Cancel my registration") and
 * Discovery ("Private and unlisted event visibility").
 *
 * The run account is a Duncit member, so Lite's sign-in asks the main API for
 * its own login code (auth.service.ts requestCode, via DUNCIT) and the code is
 * read from the OTP testing API like any other. Every event here is UNLISTED or
 * PRIVATE, so it never appears on Discover; the account registers for its own
 * event, checks itself in, and at the end cancels the registration and deletes
 * the event. Lite has no calendar delete: the one calendar made here stays,
 * owned by the run's Lite account and featured nowhere.
 */

const liteGraphql = (): string => `${String(Cypress.env('LITE_URL'))}/graphql`;

/** One operation against Lite's API, answered raw. */
function lite(query: string, variables: Record<string, unknown>, token: string | null): Cypress.Chainable<GqlBody> {
  return cy
    .request<GqlBody>({
      method: 'POST',
      url: liteGraphql(),
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: { query, variables },
      failOnStatusCode: false,
      log: false,
    })
    .then((res) => cy.wrap(res.body ?? {}, { log: false }));
}

/** The same, failing on any error, yielding `field`. */
function liteOk<T>(field: string, query: string, variables: Record<string, unknown>, token: string | null): Cypress.Chainable<T> {
  return lite(query, variables, token).then((body) => {
    expect(body.errors, `${field} must answer without an error`).to.be.undefined;
    return cy.wrap(body.data?.[field] as T, { log: false });
  });
}

const REQUEST_CODE = `mutation E2eLiteRequestCode($email: String!) {
  liteRequestSignInCode(email: $email) { ok via test_code }
}`;
const VERIFY = `mutation E2eLiteVerify($email: String!, $code: String!) {
  liteVerifySignInCode(email: $email, code: $code) { token user { email } }
}`;
const PROFILE = `mutation E2eLiteProfile($input: LiteProfileInput!) { liteUpdateProfile(input: $input) { handle bio } }`;
const PUBLIC_PROFILE = `query E2eLiteUser($handle: String!) { liteUserProfile(handle: $handle) { handle bio email } }`;
const CAL_CREATE = `mutation E2eLiteCalendar($input: LiteCalendarInput!) { liteCreateCalendar(input: $input) { id slug } }`;
const CAL_MINE = `query E2eLiteMyCalendars { liteMyCalendars { id } }`;
const CAL_FIELDS = 'id subscriber_count viewer_subscribed';
const SUBSCRIBE = `mutation E2eLiteSubscribe($id: ID!) { liteSubscribeCalendar(id: $id) { ${CAL_FIELDS} } }`;
const UNSUBSCRIBE = `mutation E2eLiteUnsubscribe($id: ID!) { liteUnsubscribeCalendar(id: $id) { ${CAL_FIELDS} } }`;
const EVENT_FIELDS = 'id slug title status visibility viewer_is_host tickets { id name price } questions { id label }';
const CREATE = `mutation E2eLiteCreate($input: LiteEventInput!) { liteCreateEvent(input: $input) { ${EVENT_FIELDS} } }`;
const UPDATE = `mutation E2eLiteUpdate($id: ID!, $input: LiteEventInput!) { liteUpdateEvent(id: $id, input: $input) { ${EVENT_FIELDS} } }`;
const PUBLISH = `mutation E2eLitePublish($id: ID!) { litePublishEvent(id: $id) { status } }`;
const CANCEL = `mutation E2eLiteCancel($id: ID!) { liteCancelEvent(id: $id, reason: "E2E run finished") { status } }`;
const DUPLICATE = `mutation E2eLiteDuplicate($id: ID!) { liteDuplicateEvent(id: $id) { id title status } }`;
const DELETE = `mutation E2eLiteDelete($id: ID!) { liteDeleteEvent(id: $id) }`;
const EVENT = `query E2eLiteEvent($slug: String!) { liteEvent(slug: $slug) { ${EVENT_FIELDS} } }`;
const SEARCH = `query E2eLiteSearch($search: String!) { liteEvents(filter: { search: $search }) { total } }`;
const REGISTER = `mutation E2eLiteRegister($id: ID!, $input: LiteRegisterInput!) { liteRegister(event_id: $id, input: $input) { id code status } }`;
const CANCEL_REG = `mutation E2eLiteCancelReg($id: ID!) { liteCancelRegistration(id: $id) { status } }`;
const GUESTS = `query E2eLiteGuests($id: ID!) { liteEventRegistrations(event_id: $id) { id code status } }`;
const CHECK_IN = `mutation E2eLiteCheckIn($id: ID!, $code: String!) { liteHostCheckInByCode(event_id: $id, code: $code) { id checked_in_at } }`;

interface LiteEvent {
  id: string;
  slug: string;
  title: string;
  status: string;
  visibility: string;
  viewer_is_host: boolean;
  tickets: Array<{ id: string; name: string; price: number }>;
  questions: Array<{ id: string; label: string }>;
}

const bad = (message: string): Refusal => refusal('BAD_USER_INPUT', message);
const QUESTION = 'Which snack should we bring?';
const DAY_MS = 86_400_000;

describe('API · Duncit Lite: sign in, host an unlisted event, register, check in and cancel', { testIsolation: false }, () => {
  const account = runAccount();
  const email = account.email.toLowerCase();
  const handle = `e2e_${account.stamp}`.toLowerCase().slice(0, 30);
  let token = '';
  let event: LiteEvent;
  let registrationId = '';
  let code = '';

  /** A valid event; each scenario changes only what it is about. */
  const input = (overrides: Record<string, unknown> = {}) => ({
    title: marked('lite event'),
    description: 'An unlisted event the E2E run hosts and removes.',
    start_at: new Date(Date.now() + 7 * DAY_MS).toISOString(),
    end_at: new Date(Date.now() + 7 * DAY_MS + 7_200_000).toISOString(),
    timezone: 'Asia/Kolkata',
    location_type: 'IN_PERSON',
    venue_name: 'E2E Hall',
    visibility: 'UNLISTED',
    capacity: 5,
    tickets: [{ name: 'Free', price: 0, quantity: 5 }],
    questions: [{ label: QUESTION, type: 'TEXT', required: true }],
    ...overrides,
  });
  /** The event as it stands, keeping its ticket and question ids so their sales and answers survive the edit. */
  const asSaved = (overrides: Record<string, unknown> = {}) =>
    input({
      tickets: event.tickets.map((t) => ({ id: t.id, name: t.name, price: t.price, quantity: 5 })),
      questions: event.questions.map((q) => ({ id: q.id, label: q.label, type: 'TEXT', required: true })),
      ...overrides,
    });

  after(() => {
    if (!event) return;
    if (registrationId) lite(CANCEL_REG, { id: registrationId }, token);
    lite(DELETE, { id: event.id }, token);
  });

  it('LT-01 sign-in refuses a malformed email, then takes the Duncit login code; a second ask waits, a wrong code is refused', () => {
    lite(REQUEST_CODE, { email: 'abc' }, null).then((body) =>
      expectRefused('liteRequestSignInCode', body, bad('Enter a valid email address')),
    );
    cy.lastOtpIssuedAt('LOGIN', { email }).then((before) => {
      liteOk<{ ok: boolean; via: string; test_code: string | null }>('liteRequestSignInCode', REQUEST_CODE, { email }, null).should(
        'deep.equal',
        { ok: true, via: 'DUNCIT', test_code: null },
      );
      lite(REQUEST_CODE, { email }, null).then((body) => {
        expect(body.errors?.[0]?.extensions?.code).to.equal('BAD_USER_INPUT');
        expect(body.errors?.[0]?.message).to.match(/^Please wait \d+s before asking for another code$/);
      });
      cy.readOtp('LOGIN', { email }, before).then((otp) => {
        const wrong = `${(Number(otp[0]) + 1) % 10}${otp.slice(1)}`;
        lite(VERIFY, { email, code: wrong }, null).then((body) => expectRefused('liteVerifySignInCode', body, bad('That code is not right')));
        liteOk<{ token: string; user: { email: string } }>('liteVerifySignInCode', VERIFY, { email, code: otp }, null).then((auth) => {
          expect(auth.user.email, 'the Lite account is the run account’s').to.equal(email);
          token = auth.token;
        });
      });
    });
  });

  it('LT-02 a handle must be 3 to 30 characters; a saved one opens a public page that shows no email', () => {
    lite(PROFILE, { input: { handle: 'AB' } }, token).then((body) =>
      expectRefused('liteUpdateProfile', body, bad('A handle is 3 to 30 letters, numbers or underscores')),
    );
    const bio = marked('lite bio');
    liteOk('liteUpdateProfile', PROFILE, { input: { handle, bio } }, token).should('deep.equal', { handle, bio });
    liteOk('liteUserProfile', PUBLIC_PROFILE, { handle }, null).should('deep.equal', { handle, bio, email: '' });
  });

  it('LT-03 a calendar refuses a reserved link, and subscribing counts each account once', () => {
    lite(CAL_CREATE, { input: { name: marked('lite calendar'), slug: 'discover' } }, token).then((body) =>
      expectRefused('liteCreateCalendar', body, bad('That link is reserved; pick another')),
    );
    lite(SUBSCRIBE, { id: '000000000000000000000000' }, null).then((body) =>
      expectRefused('liteSubscribeCalendar', body, refusal('UNAUTHENTICATED', 'Please sign in to continue')),
    );
    liteOk<{ id: string; slug: string }>('liteCreateCalendar', CAL_CREATE, { input: { name: `E2E calendar ${account.stamp}` } }, token).then((cal) => {
      expect(cal.slug, 'the link is made from the name').to.contain(account.stamp.toLowerCase());
      liteOk<Array<{ id: string }>>('liteMyCalendars', CAL_MINE, {}, token).should((mine) => expect(mine.map((c) => c.id)).to.include(cal.id));
      liteOk('liteSubscribeCalendar', SUBSCRIBE, { id: cal.id }, token).should('deep.equal', { id: cal.id, subscriber_count: 1, viewer_subscribed: true });
      liteOk('liteSubscribeCalendar', SUBSCRIBE, { id: cal.id }, token).should('deep.equal', { id: cal.id, subscriber_count: 1, viewer_subscribed: true });
      liteOk('liteUnsubscribeCalendar', UNSUBSCRIBE, { id: cal.id }, token).should('deep.equal', { id: cal.id, subscriber_count: 0, viewer_subscribed: false });
    });
  });

  it('LT-04 an event that ends before it starts, an online one without a link or a paid one without UPI is refused', () => {
    const start = Date.now() + 7 * DAY_MS;
    const reversed = { start_at: new Date(start).toISOString(), end_at: new Date(start - 3_600_000).toISOString() };
    lite(CREATE, { input: input(reversed) }, token).then((body) => expectRefused('liteCreateEvent', body, bad('The event must end after it starts')));
    lite(CREATE, { input: input({ location_type: 'VIRTUAL', venue_name: null }) }, token).then((body) =>
      expectRefused('liteCreateEvent', body, bad('Add the join link for an online event')),
    );
    lite(CREATE, { input: input({ tickets: [{ name: 'Paid', price: 200, quantity: 5 }] }) }, token).then((body) =>
      expectRefused('liteCreateEvent', body, bad('Add your UPI ID so guests can pay you for a paid ticket')),
    );
  });

  it('LT-05 a draft is the host’s alone; published unlisted it opens by link but is listed nowhere', () => {
    liteOk<LiteEvent>('liteCreateEvent', CREATE, { input: input() }, token).then((created) => {
      event = created;
      expect(created).to.deep.include({ status: 'DRAFT', visibility: 'UNLISTED', viewer_is_host: true });
      liteOk('liteEvent', EVENT, { slug: created.slug }, null).should('be.null');
      liteOk('litePublishEvent', PUBLISH, { id: created.id }, token).should('deep.equal', { status: 'PUBLISHED' });
      liteOk<LiteEvent>('liteEvent', EVENT, { slug: created.slug }, null).should('deep.include', { id: created.id, viewer_is_host: false });
      liteOk('liteEvents', SEARCH, { search: created.title }, null).should('deep.equal', { total: 0 });
      cy.request({ url: `${String(Cypress.env('LITE_URL'))}/ics/event/${created.slug}.ics`, failOnStatusCode: false }).then((res) => {
        expect(res.status, 'an unlisted event can be added to a calendar').to.equal(200);
        expect(String(res.body)).to.contain('BEGIN:VCALENDAR');
      });
    });
  });

  it('LT-06 registration needs every required answer, confirms a free ticket once, and refuses a second', () => {
    const ticket_id = event.tickets[0].id;
    lite(REGISTER, { id: event.id, input: { ticket_id, quantity: 1, answers: [] } }, token).then((body) =>
      expectRefused('liteRegister', body, bad(`Please answer: ${QUESTION}`)),
    );
    const answers = [{ question_id: event.questions[0].id, answer: 'Samosas' }];
    liteOk<{ id: string; code: string; status: string }>('liteRegister', REGISTER, { id: event.id, input: { ticket_id, quantity: 1, answers } }, token).then(
      (registration) => {
        expect(registration.status).to.equal('CONFIRMED');
        expect(registration.code).to.match(/^\w{6}$/);
        registrationId = registration.id;
        code = registration.code;
      },
    );
    lite(REGISTER, { id: event.id, input: { ticket_id, quantity: 1, answers } }, token).then((body) =>
      expectRefused('liteRegister', body, bad('You are already registered for this event')),
    );
  });

  it('LT-07 the host sees the guest list and checks a confirmed code in exactly once', () => {
    liteOk('liteEventRegistrations', GUESTS, { id: event.id }, token).should('deep.equal', [
      { id: registrationId, code, status: 'CONFIRMED' },
    ]);
    liteOk<{ checked_in_at: string | null }>('liteHostCheckInByCode', CHECK_IN, { id: event.id, code }, token)
      .its('checked_in_at')
      .should('match', /^\d{4}-\d{2}-\d{2}T/);
    lite(CHECK_IN, { id: event.id, code }, token).then((body) =>
      expectRefused('liteHostCheckInByCode', body, bad('This ticket was already checked in')),
    );
    lite(CHECK_IN, { id: event.id, code: 'E2E000' }, token).then((body) =>
      expectRefused('liteHostCheckInByCode', body, refusal('NOT_FOUND', 'A ticket with that code could not be found')),
    );
  });

  it('LT-08 made private, the event and its calendar file are hidden from everyone but its host', () => {
    liteOk('liteUpdateEvent', UPDATE, { id: event.id, input: asSaved({ visibility: 'PRIVATE' }) }, token)
      .its('visibility')
      .should('eq', 'PRIVATE');
    liteOk('liteEvent', EVENT, { slug: event.slug }, null).should('be.null');
    liteOk<LiteEvent>('liteEvent', EVENT, { slug: event.slug }, token).its('viewer_is_host').should('eq', true);
    cy.request({ url: `${String(Cypress.env('LITE_URL'))}/ics/event/${event.slug}.ics`, failOnStatusCode: false })
      .its('status')
      .should('eq', 404);
  });

  it('LT-09 a duplicate is a new draft with "(copy)" and no guests, and can be deleted', () => {
    liteOk<{ id: string; title: string; status: string }>('liteDuplicateEvent', DUPLICATE, { id: event.id }, token).then((copy) => {
      expect(copy).to.deep.include({ title: `${event.title} (copy)`, status: 'DRAFT' });
      expect(copy.id).not.to.equal(event.id);
      liteOk('liteEventRegistrations', GUESTS, { id: copy.id }, token).should('deep.equal', []);
      liteOk('liteDeleteEvent', DELETE, { id: copy.id }, token).should('eq', true);
    });
  });

  it('LT-10 a cancelled event can be neither edited nor published; with its guest gone it is deleted', () => {
    liteOk('liteCancelEvent', CANCEL, { id: event.id }, token).should('deep.equal', { status: 'CANCELLED' });
    lite(UPDATE, { id: event.id, input: asSaved() }, token).then((body) =>
      expectRefused('liteUpdateEvent', body, bad('A cancelled event cannot be edited')),
    );
    lite(PUBLISH, { id: event.id }, token).then((body) =>
      expectRefused('litePublishEvent', body, bad('A cancelled event cannot be published')),
    );
    liteOk('liteCancelRegistration', CANCEL_REG, { id: registrationId }, token).should('deep.equal', { status: 'CANCELLED' });
    liteOk('liteDeleteEvent', DELETE, { id: event.id }, token).should('eq', true);
    cy.then(() => {
      registrationId = '';
    });
    liteOk('liteEvent', EVENT, { slug: event.slug }, token).should('be.null');
  });
});
