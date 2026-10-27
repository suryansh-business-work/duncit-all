/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused, expectRead, expectTableRead, NO_ID } from '../../../support/api-staff';

/**
 * Staff › Ownership move — WhatsApp moved to Communications, email campaigns
 * stayed with Marketing. WhatsApp campaigns take SUPER_ADMIN, CITY_ADMIN,
 * COMMUNICATIONS_MANAGER (crm/marketing/waCampaign.resolver.ts ADMIN_ROLES);
 * email campaigns take SUPER_ADMIN, CITY_ADMIN, MARKETING_MANAGER
 * (marketing.resolver.ts ADMIN_ROLES), and Communications only reads the
 * audience lists (AUDIENCE_READ). MARKETING_MANAGER cannot be granted to a run
 * account, so the other direction is not automated. Scenario map: Staff ›
 * Ownership move.
 */

const ROLES: readonly E2eStaffRole[] = ['COMMUNICATIONS_MANAGER'];

const WA_CAMPAIGNS = call('waCampaignsTable', `query E2eWaCampaigns { waCampaignsTable(query: { page_size: 1 }) { total } }`);
const AUDIENCE_LISTS = call('audienceLists', `query E2eAudienceLists { audienceLists { __typename } }`);
const EMAIL_CAMPAIGN_CALLS = [
  call(
    'marketingCampaignsTable',
    `query E2eEmailCampaigns { marketingCampaignsTable(query: { page_size: 1 }) { total } }`,
  ),
  call(
    'sendMarketingCampaign',
    `mutation E2eSendEmailCampaign($id: ID!) { sendMarketingCampaign(campaign_id: $id) { __typename } }`,
    { id: NO_ID },
  ),
  call(
    'deleteMarketingCampaign',
    `mutation E2eDeleteEmailCampaign($id: ID!) { deleteMarketingCampaign(campaign_id: $id) }`,
    { id: NO_ID },
  ),
];

describe('API · WhatsApp is Communications, email campaigns are Marketing', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('OM-01 COMMUNICATIONS_MANAGER reads WhatsApp campaigns and the audience lists', () => {
    asRole('COMMUNICATIONS_MANAGER', (token) => {
      expectTableRead(token, WA_CAMPAIGNS);
      expectRead<unknown[]>(token, AUDIENCE_LISTS).then((lists) => expect(lists).to.be.an('array'));
    });
  });

  it('OM-02 COMMUNICATIONS_MANAGER is refused listing, sending and deleting email campaigns', () => {
    asRole('COMMUNICATIONS_MANAGER', (token) => expectCallsRefused(token, EMAIL_CAMPAIGN_CALLS));
  });
});
