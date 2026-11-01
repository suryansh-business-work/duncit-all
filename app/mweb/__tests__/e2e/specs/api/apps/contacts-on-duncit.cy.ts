/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { marked, refusal } from '../../../support/api-apps';
import { runAccount } from '../../../support/run-account';

/**
 * Your Contacts on Duncit and Contacts invite — the server half the mWeb
 * Contact Picker and the native phone-book sync both call. Scenario map: Apps ›
 * Your Contacts on Duncit ("Sync contacts", "No contacts on Duncit yet",
 * "Remove synced contacts") and Apps › Contacts invite ("Invites skipped or
 * failed").
 *
 * contacts.service.ts syncContacts re-keys every number to its last ten digits,
 * drops anything shorter than seven, keeps one row per key and REPLACES both
 * lists on each sync; a number that reaches no account becomes an invite row.
 * contacts.invite.ts only ever texts numbers on the caller's own invite list
 * that were never invited. The numbers synced here start with 1, which no
 * Indian mobile number does, so they match nobody — and no invite is ever sent
 * to them: the one invite call names a number that is not on the list.
 */

const SYNC = `mutation E2eSyncContacts($entries: [ContactEntryInput!]!, $batch: ContactSyncBatchInput) {
  syncContacts(entries: $entries, batch: $batch) { submitted matched new_matches invitable sync_id }
}`;
const STATUS = `query E2eContactsSync { myContactsSync { submitted matched invitable } }`;
const MATCHED = `query E2eContactsOnDuncit { contactsOnDuncitPage(offset: 0, limit: 50) { total rows { contact_label } } }`;
const TO_INVITE = `query E2eContactsToInvite { contactsToInvitePage(offset: 0, limit: 50) { total rows { phone_key contact_label invited_at } } }`;
const INVITE = `mutation E2eInviteContacts($keys: [String!]) {
  inviteContacts(phone_keys: $keys) { requested sent skipped failed sent_keys }
}`;
const CLEAR = `mutation E2eClearContacts { clearMyContacts }`;

interface InviteRow {
  phone_key: string;
  contact_label: string;
  invited_at: string | null;
}

describe('API · A member’s synced contacts are their own, and only their own list is ever invited', { testIsolation: false }, () => {
  const digits = runAccount().stamp.replaceAll(/\D/g, '').padStart(9, '0').slice(-9);
  /** Two numbers no Indian mobile can have (they start with 1), as a phone book would write them. */
  const first = `1${digits}`;
  const second = `1${[...digits].reverse().join('')}`;
  const firstLabel = marked('contact one');
  const secondLabel = marked('contact two');
  let token = '';

  before(() => {
    signInRunMember().then((member) => {
      token = member;
      cy.gql(CLEAR, {}, { token: member });
    });
  });

  after(() => {
    cy.gqlRaw(CLEAR, {}, { token });
  });

  it('CT-01 a signed-out caller can neither sync, read, invite nor clear contacts', () => {
    cy.gqlRaw(SYNC, { entries: [{ phone_key: first }] }, { token: null }).then((body) =>
      expectRefused('syncContacts', body, SIGNED_OUT),
    );
    cy.gqlRaw(STATUS, {}, { token: null }).then((body) => expectRefused('myContactsSync', body, SIGNED_OUT));
    cy.gqlRaw(TO_INVITE, {}, { token: null }).then((body) => expectRefused('contactsToInvitePage', body, SIGNED_OUT));
    cy.gqlRaw(INVITE, { keys: [first] }, { token: null }).then((body) => expectRefused('inviteContacts', body, SIGNED_OUT));
    cy.gqlRaw(CLEAR, {}, { token: null }).then((body) => expectRefused('clearMyContacts', body, SIGNED_OUT));
  });

  it('CT-02 before any sync there is no sync on record and both lists are empty', () => {
    cy.gql<{ myContactsSync: unknown }>(STATUS, {}, { token }).its('myContactsSync').should('be.null');
    cy.gql<{ contactsOnDuncitPage: { total: number } }>(MATCHED, {}, { token }).its('contactsOnDuncitPage.total').should('eq', 0);
    cy.gql<{ contactsToInvitePage: { total: number } }>(TO_INVITE, {}, { token }).its('contactsToInvitePage.total').should('eq', 0);
  });

  it('CT-03 a sync keys each number once, drops too-short ones, and keeps the unmatched as the invite list', () => {
    const entries = [
      { phone_key: `+91 ${first.slice(0, 5)} ${first.slice(5)}`, label: firstLabel },
      { phone_key: first, label: 'duplicate of the first' },
      { phone_key: second, label: secondLabel },
      { phone_key: '12345', label: 'too short to be a number' },
    ];
    cy.gql<{ syncContacts: Record<string, unknown> }>(SYNC, { entries }, { token }).then(({ syncContacts }) => {
      expect(syncContacts).to.deep.include({ submitted: 2, matched: 0, new_matches: 0, invitable: 2 });
    });
    cy.gql<{ myContactsSync: unknown }>(STATUS, {}, { token })
      .its('myContactsSync')
      .should('deep.equal', { submitted: 2, matched: 0, invitable: 2 });
    cy.gql<{ contactsToInvitePage: { total: number; rows: InviteRow[] } }>(TO_INVITE, {}, { token }).then(({ contactsToInvitePage }) => {
      expect(contactsToInvitePage.total).to.equal(2);
      const byKey = Object.fromEntries(contactsToInvitePage.rows.map((row) => [row.phone_key, row]));
      expect(byKey[first], 'the first label seen is kept').to.deep.equal({ phone_key: first, contact_label: firstLabel, invited_at: null });
      expect(byKey[second]).to.deep.equal({ phone_key: second, contact_label: secondLabel, invited_at: null });
    });
  });

  it('CT-04 with nobody matched, the radar has no contacts on Duncit', () => {
    cy.gql<{ contactsOnDuncitPage: { total: number; rows: unknown[] } }>(MATCHED, {}, { token })
      .its('contactsOnDuncitPage')
      .should('deep.equal', { total: 0, rows: [] });
  });

  it('CT-05 an invite naming a number that is not on the member’s list sends nothing', () => {
    cy.gql<{ inviteContacts: unknown }>(INVITE, { keys: ['1000000001'] }, { token })
      .its('inviteContacts')
      .should('deep.equal', { requested: 0, sent: 0, skipped: 0, failed: 0, sent_keys: [] });
    cy.gql<{ contactsToInvitePage: { rows: InviteRow[] } }>(TO_INVITE, {}, { token })
      .its('contactsToInvitePage.rows')
      .should((rows: InviteRow[]) =>
        rows.forEach((row) => expect(row.invited_at, `${row.phone_key} was not invited`).to.be.null),
      );
  });

  it('CT-06 a later sync replaces the lists: a number no longer in the phone book leaves them', () => {
    cy.gql<{ syncContacts: Record<string, unknown> }>(SYNC, { entries: [{ phone_key: first, label: firstLabel }] }, { token })
      .its('syncContacts')
      .should('deep.include', { submitted: 1, invitable: 1 });
    cy.gql<{ contactsToInvitePage: { total: number; rows: InviteRow[] } }>(TO_INVITE, {}, { token }).then(({ contactsToInvitePage }) => {
      expect(contactsToInvitePage.total).to.equal(1);
      expect(contactsToInvitePage.rows.map((row) => row.phone_key)).to.deep.equal([first]);
    });
  });

  it('CT-07 a slice naming a sync id the server never issued is refused', () => {
    cy.gqlRaw(SYNC, { entries: [{ phone_key: second }], batch: { sync_id: 'not-a-sync', last: true } }, { token }).then((body) =>
      expectRefused('syncContacts', body, refusal('BAD_USER_INPUT', 'sync_id was not issued by a contacts sync')),
    );
  });

  it('CT-08 removing synced contacts forgets the sync and both lists', () => {
    cy.gql<{ clearMyContacts: boolean }>(CLEAR, {}, { token }).its('clearMyContacts').should('eq', true);
    cy.gql<{ myContactsSync: unknown }>(STATUS, {}, { token }).its('myContactsSync').should('be.null');
    cy.gql<{ contactsToInvitePage: { total: number } }>(TO_INVITE, {}, { token }).its('contactsToInvitePage.total').should('eq', 0);
    cy.gql<{ contactsOnDuncitPage: { total: number } }>(MATCHED, {}, { token }).its('contactsOnDuncitPage.total').should('eq', 0);
  });
});
