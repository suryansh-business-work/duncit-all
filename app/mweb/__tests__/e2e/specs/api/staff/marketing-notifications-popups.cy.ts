/// <reference types="cypress" />
import { runMarker } from '@duncit/utils';
import { expectRefused, revokeRunRoles, signInRunAs, signInRunMember, type Refusal } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused, NO_ID } from '../../../support/api-staff';
import { runAccount } from '../../../support/run-account';

/**
 * Marketing › Notifications and App Popups, driven as CITY_ADMIN — in both
 * resolvers' write gate (engagement/notification ADMIN_WRITE,
 * engagement/appPopup MARKETING_WRITE: SUPER_ADMIN, CITY_ADMIN,
 * MARKETING_MANAGER) and the seat a run account may hold.
 *
 * Nobody but the run account is ever reached:
 * - The one notification sent is SILENT (no push) and scoped to USER with the
 *   run account as its only target; it is read back from the run account's own
 *   inbox and deleted. The refusals are the `assertCreateInput` rules that
 *   need no location or list — each still aims at the run account alone, so
 *   even a broken rule could only notify it. (A LOCATION/ZONE send missing its
 *   place falls through to every active user in resolveTargetUsers, so those
 *   two rules are deliberately not sent.)
 * - The popup is created DISABLED, so activeAppPopup never offers it to anyone;
 *   every invalid popup is refused in `toDoc` before the create.
 *
 * Scenario map: Marketing › Notifications, App Popups.
 */

const ME = `query E2eMarketingMe { me { user_id } }`;
const CREATE_NOTIFICATION = `mutation E2eNotify($input: CreateNotificationInput!) {
  createNotification(input: $input) { id title scope silent target_user_ids delivered_count failed_count }
}`;
const DELETE_NOTIFICATION = `mutation E2eDeleteNotification($id: ID!) { deleteNotification(notification_doc_id: $id) }`;
const NOTIFICATIONS = `query E2eNotificationsTable($search: String) { notificationsTable(query: { search: $search, page_size: 20 }) { rows { id title } } }`;
const MY_INBOX = `query E2eMyInbox { myNotifications(limit: 50) { id notification { id title } } }`;

const POPUP_FIELDS = 'id name enabled platform start_at end_at cta_label cta_url audience_type audience_list_id';
const CREATE_POPUP = `mutation E2eCreatePopup($input: AppPopupInput!) { createAppPopup(input: $input) { ${POPUP_FIELDS} } }`;
const UPDATE_POPUP = `mutation E2eUpdatePopup($id: ID!, $input: AppPopupInput!) { updateAppPopup(id: $id, input: $input) { ${POPUP_FIELDS} } }`;
const DELETE_POPUP = `mutation E2eDeletePopup($id: ID!) { deleteAppPopup(id: $id) }`;
const POPUPS = `query E2ePopups($search: String) { appPopupsTable(query: { search: $search, page_size: 20 }) { rows { id name } } }`;
const ACTIVE_POPUP = `query E2eActivePopup($platform: AppPopupClientPlatform!) { activeAppPopup(platform: $platform) { id enabled } }`;

const bad = (message: string): Refusal => ({ code: 'BAD_USER_INPUT', message });
const DAY = 24 * 60 * 60 * 1000;

describe('API · Marketing notifications and popups that reach nobody but the run account', { testIsolation: false }, () => {
  const marker = (): string => runMarker(runAccount().stamp, 'mweb');
  let token = '';
  let me = '';

  const popup = (overrides: Record<string, unknown> = {}) => ({
    name: `${marker()} popup`,
    image_url: 'https://duncit.com/duncit-logo.svg',
    start_at: new Date(Date.now() - DAY).toISOString(),
    end_at: new Date(Date.now() + 7 * DAY).toISOString(),
    enabled: false,
    platform: 'ANDROID',
    ...overrides,
  });
  const toMe = (overrides: Record<string, unknown> = {}) => ({
    title: `${marker()} notice`,
    body: 'An e2e notice only the run account receives',
    scope: 'USER',
    silent: true,
    target_user_ids: [me],
    ...overrides,
  });

  before(() => {
    signInRunMember();
    signInRunAs(['CITY_ADMIN']).then((t) => {
      token = t;
      cy.gql<{ me: { user_id: string } }>(ME, {}, { token: t }).then((data) => {
        me = data.me.user_id;
      });
    });
  });

  after(() => {
    const stamp = runAccount().stamp;
    cy.gql<{ notificationsTable: { rows: Array<{ id: string; title: string }> } }>(NOTIFICATIONS, { search: stamp }, { token }).then(
      ({ notificationsTable }) =>
        notificationsTable.rows.filter((r) => r.title.includes(stamp)).forEach((r) => cy.gql(DELETE_NOTIFICATION, { id: r.id }, { token })),
    );
    cy.gql<{ appPopupsTable: { rows: Array<{ id: string; name: string }> } }>(POPUPS, { search: stamp }, { token }).then(({ appPopupsTable }) =>
      appPopupsTable.rows.filter((r) => r.name.includes(stamp)).forEach((r) => cy.gql(DELETE_POPUP, { id: r.id }, { token })),
    );
    revokeRunRoles(['CITY_ADMIN', 'ZONAL_ADMIN']);
  });

  it('MNP-01 a notification without a title, a body or a picked user is refused before anything is sent', () => {
    cy.gqlRaw(CREATE_NOTIFICATION, { input: toMe({ title: '   ' }) }, { token }).then((body) =>
      expectRefused('createNotification', body, bad('Title required')),
    );
    cy.gqlRaw(CREATE_NOTIFICATION, { input: toMe({ body: ' ' }) }, { token }).then((body) =>
      expectRefused('createNotification', body, bad('Body required')),
    );
    cy.gqlRaw(CREATE_NOTIFICATION, { input: toMe({ target_user_ids: [] }) }, { token }).then((body) =>
      expectRefused('createNotification', body, bad('target_user_ids required for USER scope')),
    );
  });

  it('MNP-02 a silent notice to one user lands in that inbox only, pushes nothing, lists for Marketing and deletes cleanly', () => {
    cy.gql<{ createNotification: { id: string; scope: string; silent: boolean; target_user_ids: string[]; delivered_count: number } }>(
      CREATE_NOTIFICATION,
      { input: toMe() },
      { token },
    ).then(({ createNotification: sent }) => {
      expect(sent.scope).to.equal('USER');
      expect(sent.silent, 'in-app only').to.equal(true);
      expect(sent.target_user_ids, 'the run account alone').to.deep.equal([me]);
      expect(sent.delivered_count, 'a silent notice pushes nothing').to.equal(0);
      cy.gql<{ myNotifications: Array<{ notification: { id: string } }> }>(MY_INBOX, {}, { token }).then(({ myNotifications }) =>
        expect(myNotifications.map((n) => n.notification.id), 'in the run account’s inbox').to.include(sent.id),
      );
      cy.gql<{ notificationsTable: { rows: Array<{ id: string }> } }>(NOTIFICATIONS, { search: runAccount().stamp }, { token }).then(
        ({ notificationsTable }) => expect(notificationsTable.rows.map((r) => r.id), 'listed for Marketing').to.include(sent.id),
      );
      cy.gql<{ deleteNotification: boolean }>(DELETE_NOTIFICATION, { id: sent.id }, { token }).its('deleteNotification').should('equal', true);
      cy.gql<{ myNotifications: Array<{ notification: { id: string } }> }>(MY_INBOX, {}, { token }).then(({ myNotifications }) =>
        expect(myNotifications.map((n) => n.notification.id), 'gone from the inbox with it').to.not.include(sent.id),
      );
    });
  });

  it('MNP-03 a popup breaking a rule is refused before it is saved', () => {
    const refused: Array<[Record<string, unknown>, string]> = [
      [{ name: '  ' }, 'Name is required'],
      [{ image_url: ' ' }, 'Popup image is required'],
      [{ end_at: new Date(Date.now() - 2 * DAY).toISOString() }, 'End date must be after the start date'],
      [{ start_at: 'not a date' }, 'Start date is not a valid date'],
      [{ cta_url: '/earn', cta_label: '' }, 'A CTA link needs a button label'],
      [{ audience_type: 'AUDIENCE_LIST' }, 'Pick an audience list'],
    ];
    refused.forEach(([overrides, message]) =>
      cy.gqlRaw(CREATE_POPUP, { input: popup(overrides) }, { token }).then((body) => expectRefused('createAppPopup', body, bad(message))),
    );
    cy.gql<{ appPopupsTable: { rows: unknown[] } }>(POPUPS, { search: runAccount().stamp }, { token }).then(({ appPopupsTable }) =>
      expect(appPopupsTable.rows, 'nothing was saved').to.be.empty,
    );
  });

  it('MNP-04 a disabled popup is saved, never offered to anyone, edited, and deleted once', () => {
    cy.gql<{ createAppPopup: { id: string; enabled: boolean; platform: string; audience_type: string } }>(
      CREATE_POPUP,
      { input: popup({ cta_label: 'Start hosting', cta_url: '/earn' }) },
      { token },
    ).then(({ createAppPopup: saved }) => {
      expect(saved.enabled).to.equal(false);
      expect(saved.platform).to.equal('ANDROID');
      expect(saved.audience_type, 'everyone by default').to.equal('ALL_USERS');
      cy.gql<{ activeAppPopup: { id: string } | null }>(ACTIVE_POPUP, { platform: 'ANDROID' }, { token }).then(({ activeAppPopup }) =>
        expect(activeAppPopup?.id, 'a switched-off popup is never offered').to.not.equal(saved.id),
      );
      const ends = new Date(Date.now() + 3 * DAY).toISOString();
      cy.gql<{ updateAppPopup: { end_at: string; cta_url: string; enabled: boolean } }>(
        UPDATE_POPUP,
        { id: saved.id, input: popup({ end_at: ends }) },
        { token },
      ).then(({ updateAppPopup }) => {
        expect(updateAppPopup.end_at).to.equal(ends);
        expect(updateAppPopup.cta_url, 'a CTA left out of the edit is cleared').to.equal('');
        expect(updateAppPopup.enabled).to.equal(false);
      });
      cy.gql<{ deleteAppPopup: boolean }>(DELETE_POPUP, { id: saved.id }, { token }).its('deleteAppPopup').should('equal', true);
      cy.gqlRaw(DELETE_POPUP, { id: saved.id }, { token }).then((body) =>
        expectRefused('deleteAppPopup', body, { code: 'NOT_FOUND', message: 'Popup not found' }),
      );
    });
  });

  it('MNP-05 ZONAL_ADMIN is refused sending, listing and deleting notifications and popups', () => {
    // asRole proves the caller holds ZONAL_ADMIN alone, so the Marketing seat is handed back first …
    revokeRunRoles(['CITY_ADMIN']);
    asRole('ZONAL_ADMIN', (zonal) =>
      expectCallsRefused(zonal, [
        call('notificationsTable', `query E2eZNotifs { notificationsTable(query: { page_size: 1 }) { total } }`),
        call(
          'createNotification',
          `mutation E2eZNotify($id: ID!) { createNotification(input: { title: "e2e", body: "e2e refused", scope: USER, silent: true, target_user_ids: [$id] }) { id } }`,
          { id: NO_ID },
        ),
        call('deleteNotification', `mutation E2eZDelNotif($id: ID!) { deleteNotification(notification_doc_id: $id) }`, { id: NO_ID }),
        call('appPopupsTable', `query E2eZPopups { appPopupsTable(query: { page_size: 1 }) { total } }`),
        call('deleteAppPopup', `mutation E2eZDelPopup($id: ID!) { deleteAppPopup(id: $id) }`, { id: NO_ID }),
      ]),
    );
    // … and taken again, so after() can sweep with a live Marketing token.
    signInRunAs(['CITY_ADMIN']).then((t) => {
      token = t;
    });
  });
});
