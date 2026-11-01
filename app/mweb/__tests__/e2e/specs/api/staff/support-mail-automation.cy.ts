/// <reference types="cypress" />
import { ACCESS_DENIED, expectRefused, revokeRunRoles, signInRunAs, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused, expectRead, NO_ID } from '../../../support/api-staff';

/**
 * Support › Mail Automation (/mail-automation) — the reply rule of each mailbox
 * Tech connected: the auto-reply message, the queue a first email opens and the
 * response window.
 *
 * platform/mailAutomation/mailAutomation.resolver.ts: reading the mailboxes and
 * their answered threads is READ_ROLES (SUPER_ADMIN, COMMUNICATIONS_MANAGER,
 * SUPPORT_MANAGER); previewing and saving a rule is RULE_ROLES (SUPER_ADMIN,
 * SUPPORT_MANAGER); connecting and disconnecting is CONNECT_ROLES (SUPER_ADMIN,
 * COMMUNICATIONS_MANAGER). mailAutomation.service.ts finds the mailbox first
 * ("Unknown mailbox"), then checks the message (not empty, carries
 * {{ticket_no}}) and the window (1–720 hours, minimum not above maximum)
 * before anything is saved. The preview composes an UNSAVED copy with the
 * sample sender, so it is safe on a live mailbox; every save sent here is one
 * those checks refuse, and the rule is read back unchanged afterwards. AI is
 * kept off in the preview so no model call is made.
 *
 * Scenario map: Support › Mail Automation ("Configure a mailbox rule" — the
 * server half of its validation and the preview; "Recently answered threads"
 * — the read). The wizard screens are not driven here.
 */

interface Mailbox {
  id: string;
  email: string;
  reply_template: string;
  ai_enabled: boolean;
  ticket_type: string;
  sla_min_hours: number;
  sla_max_hours: number;
  is_active: boolean;
}

const MAILBOX_FIELDS = 'id email reply_template ai_enabled ticket_type sla_min_hours sla_max_hours is_active';
const ACCOUNTS = call('mailAutomationAccounts', `query E2eMailboxes { mailAutomationAccounts { ${MAILBOX_FIELDS} } }`);
const threads = (id: string) =>
  call(
    'mailAutomationThreads',
    `query E2eMailThreads($id: ID!) { mailAutomationThreads(account_id: $id, limit: 3) { id ticket_no subject replied_at } }`,
    { id },
  );
const preview = (input: Record<string, unknown>) =>
  call(
    'mailAutomationPreview',
    `query E2eMailPreview($input: MailAutomationRuleInput!) { mailAutomationPreview(input: $input) { text by_ai } }`,
    { input },
  );
const saveRule = (input: Record<string, unknown>) =>
  call(
    'updateMailAutomationRule',
    `mutation E2eMailRule($input: MailAutomationRuleInput!) { updateMailAutomationRule(input: $input) { id } }`,
    { input },
  );
const CONNECT = call('mailAutomationConnectUrl', `mutation E2eMailConnect { mailAutomationConnectUrl }`);
const DISCONNECT = call(
  'disconnectMailAutomationAccount',
  `mutation E2eMailDisconnect($id: ID!) { disconnectMailAutomationAccount(id: $id) }`,
  { id: NO_ID },
);

const bad = (message: string) => ({ code: 'BAD_USER_INPUT', message });
const TEMPLATE = 'Thanks {{sender_name}} — your reference is {{ticket_no}}. We reply within {{sla}}.';

describe('API · Mailbox rules are Support’s, connections are Tech’s', { testIsolation: false }, () => {
  let memberToken = '';
  let mailbox: Mailbox | null = null;

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    signInRunAs(['SUPPORT_MANAGER']).then((token) => {
      cy.gql<{ mailAutomationAccounts: Mailbox[] }>(ACCOUNTS.query, {}, { token }).then((data) => {
        mailbox = data.mailAutomationAccounts[0] ?? null;
      });
    });
    revokeRunRoles(['SUPPORT_MANAGER']);
  });

  after(() => {
    revokeRunRoles(['SUPPORT_MANAGER', 'COMMUNICATIONS_MANAGER', 'CITY_ADMIN', 'SUPPORT_USER']);
  });

  it('MA-01 the mailboxes, their threads, the preview and a save are refused signed out and to a member', () => {
    const calls = [ACCOUNTS, threads(NO_ID), preview({ id: NO_ID }), saveRule({ id: NO_ID, is_active: false })];
    calls.forEach((c) => {
      cy.gqlRaw(c.query, c.variables, { token: null }).then((body) => expectRefused(c.field, body, SIGNED_OUT));
      cy.gqlRaw(c.query, c.variables, { token: memberToken }).then((body) =>
        expectRefused(c.field, body, ACCESS_DENIED),
      );
    });
  });

  it('MA-02 a city admin and a support agent are refused every mailbox read and the rule', () => {
    const calls = [ACCOUNTS, threads(NO_ID), preview({ id: NO_ID }), saveRule({ id: NO_ID, is_active: false })];
    asRole('CITY_ADMIN', (token) => expectCallsRefused(token, calls));
    asRole('SUPPORT_USER', (token) => expectCallsRefused(token, calls));
  });

  it('MA-03 Communications reads the mailboxes but not the rule; Support cannot connect or disconnect one', () => {
    asRole('COMMUNICATIONS_MANAGER', (token) => {
      expectRead<Mailbox[]>(token, ACCOUNTS).then((rows) => expect(rows, 'mailboxes').to.be.an('array'));
      expectCallsRefused(token, [preview({ id: NO_ID }), saveRule({ id: NO_ID, is_active: false })]);
    });
    asRole('SUPPORT_MANAGER', (token) => expectCallsRefused(token, [CONNECT, DISCONNECT]));
  });

  it('MA-04 Support reads the mailboxes, and a mailbox nobody connected is unknown to every rule call', () => {
    asRole('SUPPORT_MANAGER', (token) => {
      expectRead<Mailbox[]>(token, ACCOUNTS).then((rows) => {
        rows.forEach((row) => {
          expect(row.sla_min_hours, `${row.email} window`).to.be.at.most(row.sla_max_hours);
          expect(row.reply_template, `${row.email} message`).to.include('{{ticket_no}}');
        });
      });
      [threads(NO_ID), preview({ id: NO_ID }), saveRule({ id: NO_ID, is_active: false })].forEach((c) => {
        cy.gqlRaw(c.query, c.variables, { token }).then((body) => expectRefused(c.field, body, bad('Unknown mailbox')));
      });
    });
  });

  it('MA-05 the preview renders the typed message with the sample sender, and refuses a window out of range', function () {
    if (!mailbox) this.skip();
    const id = (mailbox as Mailbox).id;
    asRole('SUPPORT_MANAGER', (token) => {
      expectRead<{ text: string; by_ai: boolean }>(
        token,
        preview({ id, reply_template: TEMPLATE, ai_enabled: false, sla_min_hours: 6, sla_max_hours: 12 }),
      ).then((composed) => {
        expect(composed, 'the unsaved message, as written').to.deep.equal({
          text: 'Thanks Asha — your reference is ST-PREVIEW. We reply within 6-12 hours.',
          by_ai: false,
        });
      });
      const refused: Array<[Record<string, unknown>, string]> = [
        [{ sla_min_hours: 50, sla_max_hours: 24 }, 'Minimum hours cannot be greater than maximum hours'],
        [{ sla_min_hours: 24, sla_max_hours: 800 }, 'Response window cannot exceed 720 hours (30 days)'],
        [{ sla_min_hours: 0, sla_max_hours: 24 }, 'Response window must be at least 1 hour'],
      ];
      refused.forEach(([window, message]) => {
        const c = preview({ id, ai_enabled: false, ...window });
        cy.gqlRaw(c.query, c.variables, { token }).then((body) => expectRefused(c.field, body, bad(message)));
      });
    });
  });

  it('MA-06 a save with no message, no {{ticket_no}} or a reversed window is refused, and the rule is unchanged', function () {
    if (!mailbox) this.skip();
    const before = mailbox as Mailbox;
    asRole('SUPPORT_MANAGER', (token) => {
      const refused: Array<[Record<string, unknown>, string]> = [
        [{ reply_template: '   ' }, 'The reply message cannot be empty'],
        [
          { reply_template: 'We got your email.' },
          'The reply message must include {{ticket_no}} — it is the reference the sender quotes back.',
        ],
        [{ sla_min_hours: 50, sla_max_hours: 24 }, 'Minimum hours cannot be greater than maximum hours'],
      ];
      refused.forEach(([input, message]) => {
        const c = saveRule({ id: before.id, ...input });
        cy.gqlRaw(c.query, c.variables, { token }).then((body) => expectRefused(c.field, body, bad(message)));
      });
      expectRead<Mailbox[]>(token, ACCOUNTS).then((rows) => {
        expect(rows.find((row) => row.id === before.id), 'the rule as it was before').to.deep.equal(before);
      });
      expectRead<Array<{ ticket_no: string }>>(token, threads(before.id)).then((rows) => {
        expect(rows.length, 'at most the 3 asked for').to.be.at.most(3);
        rows.forEach((row) => expect(row.ticket_no, 'each answered thread quotes its ticket').to.be.a('string').and.not.be.empty);
      });
    });
  });
});
