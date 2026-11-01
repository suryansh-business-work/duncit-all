/// <reference types="cypress" />
import { ACCESS_DENIED, expectRefused, revokeRunRoles, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused, expectRead, expectTableRead, NO_ID } from '../../../support/api-staff';

/**
 * Pods Portal › Event Tickets (/event-tickets) — who may read the tickets
 * table, and who may verify a ticket's QR or check it in.
 *
 * pods/ticket/ticket.resolver.ts: the table reads for ADMIN_RW (SUPER_ADMIN,
 * CITY_ADMIN, ZONAL_ADMIN, FINANCE_MANAGER) plus the Pods console
 * (`consoleReaders('POD')` — ALL_PODS_ACCESS); verifyEventTicketQr and
 * checkInEventTicket are ADMIN_RW only, so the Pods console's own role reads
 * the table and is refused the door. A host scans through hostScanPodTicket,
 * never these. ticket.service.ts verify never throws for a bad code (a scanner
 * shows the reason), while checkIn refuses a tampered token and a ticket that
 * does not exist before anything is marked.
 *
 * Checking a ticket in marks a real attendee present, and what a host is paid is
 * counted from it, so no real ticket is touched: the codes here are tampered and
 * the ids belong to no ticket.
 *
 * Scenario map: Pods Portal › Event Tickets ("Denied roles cannot open or call
 * Attendance (/event-tickets)", "Verify and check in by QR token" — the
 * tampered-token rows). The page itself is support/specs/pods/attendance.cy.ts.
 */

const TAMPERED = 'e2e.not-a-ticket.token';

const TABLE = call('eventTicketsTable', `query E2eTicketsTable { eventTicketsTable(query: { page_size: 1 }) { total } }`);
const VERIFY = call(
  'verifyEventTicketQr',
  `mutation E2eVerifyTicket($token: String!) { verifyEventTicketQr(token: $token) { ok message ticket { id } } }`,
  { token: TAMPERED },
);
const checkIn = (input: Record<string, unknown>) =>
  call(
    'checkInEventTicket',
    `mutation E2eCheckInTicket($input: CheckInEventTicketInput!) { checkInEventTicket(input: $input) { id } }`,
    { input },
  );
const ONE_TICKET = call('eventTicket', `query E2eOneTicket($id: ID!) { eventTicket(id: $id) { id } }`, { id: NO_ID });

const DOOR = [VERIFY, checkIn({ token: TAMPERED }), checkIn({ ticket_doc_id: NO_ID }), ONE_TICKET];

describe('API · Event tickets: the Pods console reads them, admins check them in', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ALL_PODS_ACCESS', 'CITY_ADMIN', 'ALL_CLUBS_ACCESS']);
  });

  it('ET-01 the table, a verify and a check-in are refused signed out and to a member', () => {
    [TABLE, ...DOOR].forEach((c) => {
      cy.gqlRaw(c.query, c.variables, { token: null }).then((body) => expectRefused(c.field, body, SIGNED_OUT));
      cy.gqlRaw(c.query, c.variables, { token: memberToken }).then((body) =>
        expectRefused(c.field, body, ACCESS_DENIED),
      );
    });
  });

  it('ET-02 the Pods console role reads the tickets table but is refused verify, check-in and a single ticket', () => {
    asRole('ALL_PODS_ACCESS', (token) => {
      expectTableRead(token, TABLE);
      expectCallsRefused(token, DOOR);
    });
  });

  it('ET-03 another console’s staff (Clubs) are refused the table and the door', () => {
    asRole('ALL_CLUBS_ACCESS', (token) => expectCallsRefused(token, [TABLE, ...DOOR]));
  });

  it('ET-04 a city admin verifies a tampered code as invalid, and check-in refuses it and an unknown ticket', () => {
    asRole('CITY_ADMIN', (token) => {
      expectTableRead(token, TABLE);
      expectRead<{ ok: boolean; message: string; ticket: unknown }>(token, VERIFY).then((result) => {
        expect(result, 'a tampered code is a result to show, not an error').to.deep.equal({
          ok: false,
          message: 'Invalid or tampered QR code',
          ticket: null,
        });
      });
      const tampered = checkIn({ token: TAMPERED });
      cy.gqlRaw(tampered.query, tampered.variables, { token }).then((body) =>
        expectRefused(tampered.field, body, { code: 'BAD_USER_INPUT', message: 'Invalid or tampered QR code' }),
      );
      const unknown = checkIn({ ticket_doc_id: NO_ID });
      cy.gqlRaw(unknown.query, unknown.variables, { token }).then((body) =>
        expectRefused(unknown.field, body, { code: 'NOT_FOUND', message: 'Ticket not found' }),
      );
    });
  });
});
