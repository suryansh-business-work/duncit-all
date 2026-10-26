/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import {
  asRole,
  call,
  CALLS,
  expectCallsRefused,
  expectRead,
  expectTableRead,
  NO_ID,
  type StaffCall,
} from '../../../support/api-staff';

/**
 * Staff › Read vs write — seats that READ a console's data and must not
 * change it. Each read is side-effect free; each write is refused by the role
 * gate, which every resolver below runs before any lookup.
 *
 * - Coins / gift cards: *_ADMIN_READ adds CITY_ADMIN, *_ADMIN_WRITE does not (finance/coin, finance/giftcard).
 * - Users: ADMIN_ROLES reads include SUPPORT_USER, MUTATING_ROLES do not (access/user/user.resolver.ts).
 * - Upload settings / branding: ADMIN_READ vs ADMIN_WRITE SUPER_ADMIN, TECH_MANAGER (platform/uploadSetting, settings).
 * - FAQs / mailbox rules: FAQ_RW, RULE_ROLES exclude SUPPORT_USER (support/faq, platform/mailAutomation).
 * - CRM: communication logs CRM_READ add SUPPORT_USER, leads CRM_RW do not (crm/communicationLog, crm/crm).
 * - Localization: ADMIN_READ adds CITY_ADMIN, ZONAL_ADMIN, SUPPORT_USER; ADMIN_WRITE does not (platform/localization).
 */

const ROLES: readonly E2eStaffRole[] = ['CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER'];
const byId = { id: NO_ID };

const COIN_STATS = call('coinAdminStats', `query E2eCoinStats { coinAdminStats { total_outstanding } }`);
const COIN_SETTINGS = call('coinSettings', `query E2eCoinSettings { coinSettings { pod_join_earn_pct } }`);
const GIFT_CARD_STATS = call('giftCardAdminStats', `query E2eGiftCardStats { giftCardAdminStats { sold_count } }`);
const COIN_WRITES = [
  call('updateCoinSettings', `mutation E2eUpdateCoinSettings { updateCoinSettings(input: {}) { __typename } }`),
  call(
    'adjustUserCoins',
    `mutation E2eAdjustCoins($id: ID!) { adjustUserCoins(user_id: $id, direction: GRANT, coins: 1, reason: "e2e") { __typename } }`,
    byId,
  ),
  call('updateGiftCardSettings', `mutation E2eUpdateGiftCards { updateGiftCardSettings(input: {}) { __typename } }`),
];

const UPLOAD_SETTINGS = call('allUploadSettings', `query E2eUploadSettings { allUploadSettings { surface } }`);
const SETTINGS_WRITES = [
  call(
    'updateUploadSettings',
    `mutation E2eUpdateUploadSettings { updateUploadSettings(surface: MWEB, input: {}) { __typename } }`,
  ),
  CALLS.updateBranding,
];

const SUPPORT_CONTENT_WRITES = [
  call('faqSubmissionsTable', `query E2eFaqSubmissions { faqSubmissionsTable(query: { page_size: 1 }) { total } }`),
  call('updateFaq', `mutation E2eUpdateFaq($id: ID!) { updateFaq(faq_doc_id: $id, input: {}) { __typename } }`, byId),
  call('deleteFaq', `mutation E2eDeleteFaq($id: ID!) { deleteFaq(faq_doc_id: $id) }`, byId),
  call(
    'updateMailAutomationRule',
    `mutation E2eUpdateMailRule($id: ID!) { updateMailAutomationRule(input: { id: $id, is_active: false }) { __typename } }`,
    byId,
  ),
];

const LEAD_CALLS = [
  call('venueLeadsTable', `query E2eVenueLeads { venueLeadsTable(query: { page_size: 1 }) { total } }`),
  call('deleteVenueLead', `mutation E2eDeleteVenueLead($id: ID!) { deleteVenueLead(id: $id) }`, byId),
  call('deleteHostLead', `mutation E2eDeleteHostLead($id: ID!) { deleteHostLead(id: $id) }`, byId),
];

const TRANSLATIONS = call(
  'translationsTable',
  `query E2eTranslations { translationsTable(query: { page_size: 1 }) { total } }`,
);
const TRANSLATION_WRITES = [
  call(
    'upsertTranslation',
    `mutation E2eUpsertTranslation { upsertTranslation(input: { key: "e2e.never.written" }) { __typename } }`,
  ),
  call('deleteTranslation', `mutation E2eDeleteTranslation { deleteTranslation(key: "e2e.never.written") }`),
  call('upsertLocale', `mutation E2eUpsertLocale { upsertLocale(input: { code: "e2e", label: "E2E" }) { __typename } }`),
  call(
    'startAiTranslation',
    `mutation E2eStartAiTranslation { startAiTranslation(input: { locales: ["hi"], scope: MISSING }) { __typename } }`,
  ),
];

/** Each role reads `read` and is refused every one of `writes`. */
const readButNotWrite = (roles: readonly E2eStaffRole[], read: StaffCall, writes: readonly StaffCall[], table = true) =>
  roles.forEach((role) =>
    asRole(role, (token) => {
      if (table) expectTableRead(token, read);
      else expectRead(token, read);
      expectCallsRefused(token, writes);
    }),
  );

describe('API · Read-only seats cannot write', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('RW-01 CITY_ADMIN reads coin and gift card figures but is refused changing the settings or the coins of a member', () => {
    asRole('CITY_ADMIN', (token) => {
      expectRead<{ total_outstanding: number }>(token, COIN_STATS).then((stats) => {
        expect(stats.total_outstanding, 'coins still with users').to.be.a('number');
      });
      expectRead(token, COIN_SETTINGS);
      expectRead(token, GIFT_CARD_STATS);
      expectCallsRefused(token, COIN_WRITES);
    });
  });

  it('RW-02 SUPPORT_USER views users but is refused editing and deleting them', () => {
    readButNotWrite(['SUPPORT_USER'], CALLS.usersTable, [CALLS.updateUser, CALLS.deleteUser]);
  });

  it('RW-03 CITY_ADMIN, ZONAL_ADMIN and SUPPORT_USER read upload settings but are refused saving them or the branding', () => {
    readButNotWrite(ROLES, UPLOAD_SETTINGS, SETTINGS_WRITES, false);
  });

  it('RW-04 SUPPORT_USER answers tickets but is refused FAQ and mailbox-rule writes', () => {
    readButNotWrite(['SUPPORT_USER'], CALLS.tickets, SUPPORT_CONTENT_WRITES);
  });

  it('RW-05 SUPPORT_USER reads lead communication logs but is refused the leads and their deletes', () => {
    readButNotWrite(['SUPPORT_USER'], CALLS.communicationLogs, LEAD_CALLS);
  });

  it('RW-06 CITY_ADMIN, ZONAL_ADMIN and SUPPORT_USER list translations but are refused every translation write', () => {
    readButNotWrite(ROLES, TRANSLATIONS, TRANSLATION_WRITES);
  });
});
