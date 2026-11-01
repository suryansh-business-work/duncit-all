/// <reference types="cypress" />
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused, expectRead, NO_ID } from '../../../support/api-staff';

/**
 * WhatsApp campaigns and templates (Communications › WhatsApp — the Marketing
 * flow moved there): the Sent figures beside every campaign and template come
 * from waSendCounts, read by SUPER_ADMIN, CITY_ADMIN and COMMUNICATIONS_MANAGER
 * (crm/marketing/waCampaign.resolver.ts ADMIN_ROLES). The sends themselves are
 * never touched here — WhatsApp reaches real people — only refused for seats
 * outside the gate, against an id no campaign has. The page's warning and
 * Logs tab are covered by support/.../communications/whatsapp-campaigns.cy.ts,
 * the Marketing/Communications split by api/staff/ownership-move.cy.ts.
 *
 * Scenario map: Marketing › WhatsApp campaigns ("Campaign and template show
 * messages-sent counts", the cross-console gate).
 */

const COUNTS = call('waSendCounts', `query E2eWaSendCounts { waSendCounts { campaign sent attempts } }`);
const SENDS = [
  COUNTS,
  call('waCampaignsTable', `query E2eWaCampaignsGate { waCampaignsTable(query: { page_size: 1 }) { total } }`),
  call('cancelWaCampaign', `mutation E2eWaCancel($id: ID!) { cancelWaCampaign(campaign_id: $id) { id } }`, { id: NO_ID }),
  call('retryWaCampaign', `mutation E2eWaRetry($id: ID!) { retryWaCampaign(campaign_id: $id) { id } }`, { id: NO_ID }),
  call('deleteWaCampaign', `mutation E2eWaDelete($id: ID!) { deleteWaCampaign(campaign_id: $id) }`, { id: NO_ID }),
];

describe('API · WhatsApp sent counts: one figure per campaign, never more sent than tried', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['COMMUNICATIONS_MANAGER', 'ZONAL_ADMIN', 'SUPPORT_USER']);
  });

  it('WSC-01 COMMUNICATIONS_MANAGER reads one count per campaign name, each with no more sent than attempted', () => {
    asRole('COMMUNICATIONS_MANAGER', (token) => {
      expectRead<Array<{ campaign: string; sent: number; attempts: number }>>(token, COUNTS).then((counts) => {
        const names = counts.map((row) => row.campaign);
        expect(new Set(names).size, 'one row per campaign name').to.equal(names.length);
        counts.forEach((row) => {
          expect(row.sent, `${row.campaign} sent`).to.be.at.least(0);
          expect(row.sent, `${row.campaign} sent never exceeds attempts`).to.be.at.most(row.attempts);
        });
      });
    });
  });

  it('WSC-02 a member, ZONAL_ADMIN and SUPPORT_USER are refused the counts, the campaign list and every send action', () => {
    expectCallsRefused(memberToken, SENDS);
    asRole('ZONAL_ADMIN', (token) => expectCallsRefused(token, SENDS));
    asRole('SUPPORT_USER', (token) => expectCallsRefused(token, SENDS));
  });
});
