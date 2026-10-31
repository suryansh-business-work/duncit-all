/// <reference types="cypress" />
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused, expectRead } from '../../../support/api-staff';

/**
 * CRM › WhatsApp Lead Generator (/tools/whatsapp, crm/whatsapp): the gateway
 * connection and the communities, groups, contacts and user leads it has
 * cached — all CRM_RW (SUPER_ADMIN, CRM_MANAGER).
 *
 * Read-only and offline on purpose: waConnection is the STORED status (no
 * gateway call) and never returns the API key; the counters and lists read
 * the cache. Nothing connects, scans a QR, extracts, or fetches group members
 * — each of those reaches the real WhatsApp gateway and real people.
 *
 * Scenario map: CRM › WhatsApp Lead Generator.
 */

const CONNECTION = call('waConnection', `query E2eWaConnection { waConnection { base_url session_id has_api_key status phone connected_at } }`);
const STATS = call('waLeadStats', `query E2eWaStats { waLeadStats { total_leads total_communities total_groups total_contacts } }`);
const page = (field: string) =>
  call(field, `query E2eWa${field} { ${field}(input: { page: 1, page_size: 1 }) { total page_size items { id } } }`);
const LISTS = {
  total_communities: page('waCommunities'),
  total_groups: page('waGroups'),
  total_contacts: page('waContacts'),
  total_leads: page('waUserLeads'),
} as const;
const QR = call('waQr', `query E2eWaQr { waQr { status } }`);

describe('API · WhatsApp Lead Generator: the stored connection and the cached counts agree', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['CRM_MANAGER', 'CITY_ADMIN']);
  });

  it('CWG-01 CRM_MANAGER reads the stored gateway connection: a known status and whether a key is set', () => {
    asRole('CRM_MANAGER', (token) => {
      expectRead<Record<string, unknown>>(token, CONNECTION).then((connection) => {
        expect(['DISCONNECTED', 'CONNECTING', 'CONNECTED', 'ERROR'], 'status').to.include(connection.status);
        expect(connection.has_api_key, 'key flag').to.be.a('boolean');
      });
    });
  });

  it('CWG-02 each dashboard counter equals the total of the list it summarises', () => {
    asRole('CRM_MANAGER', (token) => {
      expectRead<Record<keyof typeof LISTS, number>>(token, STATS).then((stats) => {
        (Object.keys(LISTS) as Array<keyof typeof LISTS>).forEach((counter) => {
          expectRead<{ total: number; page_size: number; items: unknown[] }>(token, LISTS[counter]).then((list) => {
            expect(list.total, `${counter} matches its list`).to.equal(stats[counter]);
            expect(list.items.length, 'one page').to.be.at.most(list.page_size);
          });
        });
      });
    });
  });

  it('CWG-03 a member and CITY_ADMIN are refused the connection, the QR, the counters and the lists', () => {
    const calls = [CONNECTION, QR, STATS, ...Object.values(LISTS)];
    expectCallsRefused(memberToken, calls);
    asRole('CITY_ADMIN', (token) => expectCallsRefused(token, calls));
  });
});
