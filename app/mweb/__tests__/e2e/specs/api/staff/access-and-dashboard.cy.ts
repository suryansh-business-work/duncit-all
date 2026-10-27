/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import {
  asRole,
  call,
  CALLS,
  expectCallsRefused,
  expectRead,
  expectRolesRefused,
  expectTableRead,
  NO_ID,
} from '../../../support/api-staff';

/**
 * The Legal, Support, CRM and Marketing consoles' server gates, role by role.
 * Scenario map: Staff › Access and dashboard — "Role gate for the Legal portal",
 * "… Support portal", "… CRM portal", "… Marketing portal".
 *
 * - Legal: LEGAL_ROLES SUPER_ADMIN, LEGAL_MANAGER (content/contract, legalDocument, grievance resolvers).
 * - Support: SUPPORT_ROLES SUPER_ADMIN, SUPPORT_MANAGER, SUPPORT_USER (support/ticket/ticket.resolver.ts) —
 *   SUPPORT_USER passes the server although the console's sign-in admits only SUPPORT_MANAGER.
 * - CRM: CRM_RW SUPER_ADMIN, CRM_MANAGER (crm/crm/crm.constants.ts); communication logs add CITY_ADMIN,
 *   ZONAL_ADMIN, SUPPORT_USER (crm/communicationLog/communicationLog.resolver.ts CRM_READ).
 * - Marketing: SUPER_ADMIN, CITY_ADMIN, MARKETING_MANAGER (crm/marketing/marketing.resolver.ts ADMIN_ROLES).
 */

const ROLES: readonly E2eStaffRole[] = [
  'LEGAL_MANAGER',
  'CITY_ADMIN',
  'SUPPORT_MANAGER',
  'SUPPORT_USER',
  'CRM_MANAGER',
  'ZONAL_ADMIN',
];

const CONTRACTS = call('contractsTable', `query E2eContracts { contractsTable(query: { page_size: 1 }) { total } }`);
const LEGAL_DOCUMENTS = call(
  'legalDocumentsTable',
  `query E2eLegalDocuments { legalDocumentsTable(query: { page_size: 1 }) { total } }`,
);
const GRIEVANCE_STATS = call('grievanceStats', `query E2eGrievanceStats { grievanceStats { total } }`);
const VENUE_LEADS = call('venueLeadsTable', `query E2eVenueLeads { venueLeadsTable(query: { page_size: 1 }) { total } }`);
const CRM_CONFIG = call('crmLeadConfig', `query E2eCrmLeadConfig { crmLeadConfig { __typename } }`);
const DELETE_LEAD = call('deleteVenueLead', `mutation E2eDeleteVenueLead($id: ID!) { deleteVenueLead(id: $id) }`, {
  id: NO_ID,
});
const CAMPAIGNS = call(
  'marketingCampaignsTable',
  `query E2eMarketingCampaigns { marketingCampaignsTable(query: { page_size: 1 }) { total } }`,
);

describe('API · Legal, Support, CRM and Marketing role gates', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('AD-01 LEGAL_MANAGER reads contracts, legal documents and grievance stats', () => {
    asRole('LEGAL_MANAGER', (token) => {
      expectTableRead(token, CONTRACTS);
      expectTableRead(token, LEGAL_DOCUMENTS);
      expectRead<{ total: number }>(token, GRIEVANCE_STATS).then((stats) => {
        expect(stats.total, 'grievances on record').to.be.at.least(0);
      });
    });
  });

  it('AD-02 CITY_ADMIN and SUPPORT_MANAGER are refused the Legal operations', () => {
    expectRolesRefused(['CITY_ADMIN', 'SUPPORT_MANAGER'], [CONTRACTS, LEGAL_DOCUMENTS, GRIEVANCE_STATS]);
  });

  it('AD-03 SUPPORT_MANAGER and SUPPORT_USER read the ticket desk; CITY_ADMIN is refused it', () => {
    asRole('SUPPORT_MANAGER', (token) => expectTableRead(token, CALLS.tickets));
    asRole('SUPPORT_USER', (token) => expectTableRead(token, CALLS.tickets));
    expectRolesRefused(['CITY_ADMIN'], [CALLS.tickets]);
  });

  it('AD-04 CRM_MANAGER reads leads and the lead config', () => {
    asRole('CRM_MANAGER', (token) => {
      expectTableRead(token, VENUE_LEADS);
      expectRead(token, CRM_CONFIG);
    });
  });

  it('AD-05 CITY_ADMIN reads communication logs but is refused leads and lead deletes', () => {
    asRole('CITY_ADMIN', (token) => {
      expectTableRead(token, CALLS.communicationLogs);
      expectCallsRefused(token, [VENUE_LEADS, CRM_CONFIG, DELETE_LEAD]);
    });
  });

  it('AD-06 CITY_ADMIN reads marketing campaigns; ZONAL_ADMIN and SUPPORT_USER are refused them', () => {
    asRole('CITY_ADMIN', (token) => expectTableRead(token, CAMPAIGNS));
    expectRolesRefused(['ZONAL_ADMIN', 'SUPPORT_USER'], [CAMPAIGNS]);
  });
});
