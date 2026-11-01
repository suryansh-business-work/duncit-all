/// <reference types="cypress" />
import {
  ACCESS_DENIED,
  expectRefused,
  revokeRunRoles,
  signInRunAs,
  signInRunMember,
  SIGNED_OUT,
} from '../../../support/access-steps';
import { expectInvalid, marked, memberId, refusal } from '../../../support/api-apps';
import { runAccount } from '../../../support/run-account';
import { NO_ID } from '../../../support/staff-operations';

/**
 * App popups & Something for you — what the app asks the server on open, and
 * what decides the answer. Scenario map: Apps › App popups & Something for you
 * ("App popup with an in-app call to action", "Dismiss a popup", "Something for
 * you rail on Home").
 *
 * appPopup.service.ts activeFor serves the newest popup that is enabled, inside
 * its window, aimed at the caller's platform and audience, and not yet dismissed
 * by this user; dismissAppPopup records the close once (unique index). A popup
 * is never aimed at everyone here: it targets an audience list whose criteria
 * match nobody and whose one hand-added member is the run account, and the spec
 * proves the list holds exactly one person before any popup is made. The
 * "Something for you" card this spec writes is switched off, so Home never
 * shows it; both are deleted again at the end.
 */

const ACTIVE = `query E2eActivePopup($platform: AppPopupClientPlatform!) {
  activeAppPopup(platform: $platform) { id cta_label cta_url close_button_enabled audience_type }
}`;
const DISMISS = `mutation E2eDismissPopup($id: ID!) { dismissAppPopup(id: $id) }`;
const CREATE = `mutation E2eCreatePopup($input: AppPopupInput!) { createAppPopup(input: $input) { id enabled platform } }`;
const UPDATE = `mutation E2eUpdatePopup($id: ID!, $input: AppPopupInput!) { updateAppPopup(id: $id, input: $input) { id enabled } }`;
const DELETE = `mutation E2eDeletePopup($id: ID!) { deleteAppPopup(id: $id) }`;
const TABLE = `query E2ePopupsTable($q: TableQueryInput) { appPopupsTable(query: $q) { rows { id name audience_list_id } total } }`;
const LIST_CREATE = `mutation E2eCreateAudience($input: AudienceListInput!) { createAudienceList(input: $input) { id } }`;
const LIST_ADD = `mutation E2eAddAudience($id: ID!, $users: [ID!]!) {
  addAudienceListMembers(id: $id, user_ids: $users) { member_count manual_member_count }
}`;
const LIST_DELETE = `mutation E2eDeleteAudience($id: ID!) { deleteAudienceList(id: $id) }`;

const SFY_PUBLIC = `query E2eSfyPublic { publicSomethingForYou { id image_url is_active sort_order action_type } }`;
const SFY_ALL = `query E2eSfyAll { somethingForYouItems { id is_active } }`;
const SFY_CREATE = `mutation E2eSfyCreate($input: SomethingForYouInput!) {
  createSomethingForYouItem(input: $input) { id title is_active action_type link_path }
}`;
const SFY_DELETE = `mutation E2eSfyDelete($id: ID!) { deleteSomethingForYouItem(item_id: $id) }`;

const MINUTE = 60_000;
const POPUP_NOT_FOUND = refusal('NOT_FOUND', 'Popup not found');
const bad = (message: string) => refusal('BAD_USER_INPUT', message);

describe('API · App popups and the Something for you rail', { testIsolation: false }, () => {
  const stamp = runAccount().stamp;
  let memberToken = '';
  let adminToken = '';
  let listId = '';
  const popupIds: string[] = [];
  let cardId = '';

  const popupInput = (name: string, overrides: Record<string, unknown> = {}) => ({
    name: marked(name),
    image_url: `https://example.com/e2e-${stamp}.png`,
    start_at: new Date(Date.now() - 5 * MINUTE).toISOString(),
    end_at: new Date(Date.now() + 15 * MINUTE).toISOString(),
    enabled: true,
    platform: 'BOTH',
    close_button_enabled: true,
    cta_label: 'Refer a friend',
    cta_url: '/referral',
    audience_type: 'AUDIENCE_LIST',
    audience_list_id: listId,
    ...overrides,
  });
  const active = (platform: string) =>
    cy.gql<{ activeAppPopup: { id: string; cta_url: string; cta_label: string } | null }>(ACTIVE, { platform }, { token: adminToken });
  const create = (input: Record<string, unknown>) =>
    cy.gql<{ createAppPopup: { id: string } }>(CREATE, { input }, { token: adminToken }).then(({ createAppPopup }) => {
      popupIds.push(createAppPopup.id);
      return createAppPopup.id;
    });

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    signInRunAs(['CITY_ADMIN']).then((token) => {
      adminToken = token;
      memberId(token).then((ownId) => {
        const list = { name: marked('popup audience'), owner: `E2E ${stamp}`, search: `e2e-nobody-${stamp}-zz` };
        cy.gql<{ createAudienceList: { id: string } }>(LIST_CREATE, { input: list }, { token }).then(({ createAudienceList }) => {
          listId = createAudienceList.id;
          cy.gql<{ addAudienceListMembers: { member_count: number; manual_member_count: number } }>(
            LIST_ADD,
            { id: listId, users: [ownId] },
            { token },
          ).then(({ addAudienceListMembers }) => {
            // The gate every popup below relies on: nobody but the run account can be shown one.
            expect(addAudienceListMembers, 'the audience is the run account alone').to.deep.equal({
              member_count: 1,
              manual_member_count: 1,
            });
          });
        });
      });
    });
  });

  after(() => {
    popupIds.forEach((id) => cy.gqlRaw(DELETE, { id }, { token: adminToken }));
    if (cardId) cy.gqlRaw(SFY_DELETE, { id: cardId }, { token: adminToken });
    if (listId) cy.gqlRaw(LIST_DELETE, { id: listId }, { token: adminToken });
    revokeRunRoles(['CITY_ADMIN']);
  });

  it('AP-01 the popup and its dismissal need a signed-in caller; a member cannot manage popups', () => {
    cy.gqlRaw(ACTIVE, { platform: 'WEB' }, { token: null }).then((body) => expectRefused('activeAppPopup', body, SIGNED_OUT));
    cy.gqlRaw(DISMISS, { id: NO_ID }, { token: null }).then((body) => expectRefused('dismissAppPopup', body, SIGNED_OUT));
    cy.gqlRaw(TABLE, { q: { page_size: 1 } }, { token: memberToken }).then((body) =>
      expectRefused('appPopupsTable', body, ACCESS_DENIED),
    );
    cy.gqlRaw(CREATE, { input: popupInput('member popup') }, { token: memberToken }).then((body) =>
      expectRefused('createAppPopup', body, ACCESS_DENIED),
    );
    cy.gqlRaw(DISMISS, { id: 'not-a-popup' }, { token: memberToken }).then((body) =>
      expectRefused('dismissAppPopup', body, POPUP_NOT_FOUND),
    );
  });

  it('AP-02 a popup with a reversed window, a CTA link without a label or no audience list is refused', () => {
    const now = Date.now();
    const reversed = { start_at: new Date(now + MINUTE).toISOString(), end_at: new Date(now).toISOString() };
    const send = (overrides: Record<string, unknown>) =>
      cy.gqlRaw(CREATE, { input: popupInput('refused popup', overrides) }, { token: adminToken });
    send(reversed).then((body) => expectRefused('createAppPopup', body, bad('End date must be after the start date')));
    send({ start_at: 'not-a-date' }).then((body) => expectRefused('createAppPopup', body, bad('Start date is not a valid date')));
    send({ cta_label: '  ' }).then((body) => expectRefused('createAppPopup', body, bad('A CTA link needs a button label')));
    send({ audience_list_id: null }).then((body) => expectRefused('createAppPopup', body, bad('Pick an audience list')));
    cy.gql<{ appPopupsTable: { total: number } }>(TABLE, { q: { search: marked('refused popup') } }, { token: adminToken }).then(
      ({ appPopupsTable }) => expect(appPopupsTable.total, 'no refused popup was stored').to.equal(0),
    );
  });

  it('AP-03 a live popup reaches its audience on every platform with its in-app call to action', () => {
    create(popupInput('referral popup')).then((id) => {
      active('WEB').its('activeAppPopup').should('deep.include', { id, cta_url: '/referral', cta_label: 'Refer a friend' });
      active('ANDROID').its('activeAppPopup.id').should('eq', id);
      cy.gql<{ appPopupsTable: { rows: Array<{ id: string; audience_list_id: string }> } }>(
        TABLE,
        { q: { search: marked('referral popup') } },
        { token: adminToken },
      ).then(({ appPopupsTable }) => {
        expect(appPopupsTable.rows.map((r) => r.id)).to.deep.equal([id]);
        expect(appPopupsTable.rows[0].audience_list_id).to.equal(listId);
      });
    });
  });

  it('AP-04 switched off it is not served; an iOS-only popup never reaches a desktop browser', () => {
    const id = popupIds[0];
    cy.gql(UPDATE, { id, input: popupInput('referral popup', { enabled: false }) }, { token: adminToken });
    active('WEB').its('activeAppPopup').should((popup) => expect(popup?.id ?? null).not.to.equal(id));
    cy.gql(UPDATE, { id, input: popupInput('referral popup', { platform: 'IOS' }) }, { token: adminToken });
    active('WEB').its('activeAppPopup').should((popup) => expect(popup?.id ?? null).not.to.equal(id));
    active('IOS').its('activeAppPopup.id').should('eq', id);
  });

  it('AP-05 a dismissed popup never returns, a second dismissal is harmless, and a new campaign still shows once', () => {
    const id = popupIds[0];
    cy.gql<{ dismissAppPopup: boolean }>(DISMISS, { id }, { token: adminToken }).its('dismissAppPopup').should('eq', true);
    cy.gql<{ dismissAppPopup: boolean }>(DISMISS, { id }, { token: adminToken }).its('dismissAppPopup').should('eq', true);
    active('IOS').its('activeAppPopup').should((popup) => expect(popup?.id ?? null).not.to.equal(id));
    create(popupInput('next campaign', { close_button_enabled: false })).then((nextId) => {
      active('IOS').its('activeAppPopup.id').should('eq', nextId);
    });
  });

  it('AP-06 a deleted popup is gone, and deleting it again says so', () => {
    const id = popupIds[1];
    cy.gql<{ deleteAppPopup: boolean }>(DELETE, { id }, { token: adminToken }).its('deleteAppPopup').should('eq', true);
    popupIds.pop();
    cy.gqlRaw(DELETE, { id }, { token: adminToken }).then((body) => expectRefused('deleteAppPopup', body, POPUP_NOT_FOUND));
    active('IOS').its('activeAppPopup').should((popup) => expect(popup?.id ?? null).not.to.equal(id));
  });

  it('AP-07 Home’s rail is open to everyone and lists only active cards with a picture, in admin order', () => {
    cy.gql<{ publicSomethingForYou: Array<{ image_url: string; is_active: boolean; sort_order: number }> }>(
      SFY_PUBLIC,
      {},
      { token: null },
    ).then(({ publicSomethingForYou }) => {
      publicSomethingForYou.forEach((card) => {
        expect(card.is_active, 'only active cards').to.equal(true);
        expect(card.image_url, 'only cards with a picture').to.match(/\S/);
      });
      const order = publicSomethingForYou.map((card) => card.sort_order);
      expect(order, 'admin order').to.deep.equal([...order].sort((a, b) => a - b));
    });
    cy.gqlRaw(SFY_ALL, {}, { token: memberToken }).then((body) => expectRefused('somethingForYouItems', body, ACCESS_DENIED));
  });

  it('AP-08 a card needs a short title and the link its action names', () => {
    const send = (input: Record<string, unknown>) =>
      cy.gqlRaw(SFY_CREATE, { input: { is_active: false, image_url: 'https://example.com/e2e.png', ...input } }, { token: adminToken });
    send({ title: 'x'.repeat(31) }).then((body) =>
      expectInvalid('createSomethingForYouItem', body, ['title must be at most 30 characters']),
    );
    send({ title: `E2E ${stamp}`, action_type: 'ROUTE' }).then((body) =>
      expectInvalid('createSomethingForYouItem', body, ['Choose where this card goes']),
    );
    send({ title: `E2E ${stamp}`, action_type: 'URL', link_url: 'not a url' }).then((body) =>
      expectInvalid('createSomethingForYouItem', body, ['Use a full address, including https://']),
    );
    cy.gqlRaw(SFY_CREATE, { input: { title: `E2E ${stamp}` } }, { token: memberToken }).then((body) =>
      expectRefused('createSomethingForYouItem', body, ACCESS_DENIED),
    );
  });

  it('AP-09 a switched-off card is kept for the admin but never reaches Home', () => {
    const input = {
      title: `E2E ${stamp}`,
      image_url: 'https://example.com/e2e.png',
      action_type: 'ROUTE',
      link_path: '/gift-cards',
      is_active: false,
    };
    cy.gql<{ createSomethingForYouItem: { id: string; is_active: boolean; link_path: string } }>(
      SFY_CREATE,
      { input },
      { token: adminToken },
    ).then(({ createSomethingForYouItem: card }) => {
      cardId = card.id;
      expect(card).to.deep.include({ is_active: false, link_path: '/gift-cards' });
      cy.gql<{ somethingForYouItems: Array<{ id: string }> }>(SFY_ALL, {}, { token: adminToken })
        .its('somethingForYouItems')
        .should((items) => expect(items.map((i) => i.id)).to.include(card.id));
      cy.gql<{ publicSomethingForYou: Array<{ id: string }> }>(SFY_PUBLIC, {}, { token: null })
        .its('publicSomethingForYou')
        .should((items) => expect(items.map((i) => i.id)).not.to.include(card.id));
      cy.gql<{ deleteSomethingForYouItem: boolean }>(SFY_DELETE, { id: card.id }, { token: adminToken })
        .its('deleteSomethingForYouItem')
        .should('eq', true);
      cy.then(() => {
        cardId = '';
      });
    });
  });
});
