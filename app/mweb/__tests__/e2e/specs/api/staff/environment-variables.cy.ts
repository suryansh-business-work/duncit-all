/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused, expectRead, NO_ID } from '../../../support/api-staff';

/**
 * Tech › Environment Variables — every category is Tech's (TECH_MANAGE), except
 * MSG91, which COMMUNICATIONS_MANAGER manages from its MSG91 Settings page and
 * LOGS_MANAGER only reads (platform/envEntry/envEntry.resolver.ts readScope,
 * requireManage, manageable — all before any write). Nothing is created or
 * changed here: every write is aimed at another category or an id no entry has.
 * Scenario map: Staff › Environment Variables "COMMUNICATIONS_MANAGER may edit
 * channel entries only".
 */

const ROLES: readonly E2eStaffRole[] = ['COMMUNICATIONS_MANAGER', 'LOGS_MANAGER'];
const CHANNEL = 'MSG91';

const CATEGORIES = call('envCategories', `query E2eEnvCategories { envCategories { category } }`);
const ENTRIES = call('envEntriesTable', `query E2eEnvEntries { envEntriesTable(query: { page_size: 50 }) { rows { category } } }`);
const createIn = (category: string) =>
  call(
    'createEnvEntry',
    `mutation E2eCreateEnvEntry($category: EnvCategory!) {
      createEnvEntry(input: { name: "E2E never created", category: $category, is_active: false }) { __typename }
    }`,
    { category },
  );
const UNKNOWN_ENTRY_WRITES = [
  call('updateEnvEntry', `mutation E2eUpdateEnvEntry($id: ID!) { updateEnvEntry(id: $id, input: {}) { __typename } }`, {
    id: NO_ID,
  }),
  call('deleteEnvEntry', `mutation E2eDeleteEnvEntry($id: ID!) { deleteEnvEntry(id: $id) }`, { id: NO_ID }),
];
const ATTEMPT_SETTINGS = call('envAttemptSettings', `query E2eEnvAttempts { envAttemptSettings { __typename } }`);

/** The caller sees the channel category and nothing else. */
const expectConfinedToChannel = (token: string) => {
  expectRead<Array<{ category: string }>>(token, CATEGORIES).then((categories) => {
    expect(categories.map((c) => c.category), 'categories offered').to.deep.equal([CHANNEL]);
  });
  expectRead<{ rows: Array<{ category: string }> }>(token, ENTRIES).then((page) => {
    page.rows.forEach((row) => expect(row.category, 'listed entry category').to.equal(CHANNEL));
  });
};

describe('API · Channel entries for Communications, every other secret for Tech', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('EV-01 COMMUNICATIONS_MANAGER sees only the MSG91 category and its entries', () => {
    asRole('COMMUNICATIONS_MANAGER', expectConfinedToChannel);
  });

  it('EV-02 COMMUNICATIONS_MANAGER is refused creating payment or OpenAI entries, unknown entries and the attempt settings', () => {
    asRole('COMMUNICATIONS_MANAGER', (token) => {
      expectCallsRefused(token, [createIn('RAZORPAY'), createIn('OPENAI'), ...UNKNOWN_ENTRY_WRITES, ATTEMPT_SETTINGS]);
    });
  });

  it('EV-03 LOGS_MANAGER reads the MSG91 entries but is refused creating even an MSG91 entry', () => {
    asRole('LOGS_MANAGER', (token) => {
      expectConfinedToChannel(token);
      expectCallsRefused(token, [createIn(CHANNEL)]);
    });
  });
});
