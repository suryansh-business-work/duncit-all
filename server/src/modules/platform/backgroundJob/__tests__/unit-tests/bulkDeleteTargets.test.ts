import { BULK_DELETE_TARGETS } from '../../bulkDelete.targets';

describe('BULK_DELETE_TARGETS', () => {
  const entries = Object.entries(BULK_DELETE_TARGETS);

  it('registers App Builds with the Tech roles its row delete is gated on', () => {
    expect(BULK_DELETE_TARGETS.appBuildsTable).toEqual({
      mutation: 'deleteAppBuild',
      roles: ['SUPER_ADMIN', 'TECH_MANAGER'],
    });
  });

  it('names a <name>Table query, a delete mutation and at least one role for every table', () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const [table, target] of entries) {
      expect(table).toMatch(/Table$/);
      expect(target.mutation).toMatch(/^(delete|crmDelete)[A-Z]/);
      expect(target.roles.length).toBeGreaterThan(0);
    }
  });

  it('leaves out the tables whose delete refunds, closes an account or needs a password', () => {
    for (const table of ['podsTable', 'usersTable', 'partnersTable', 'hostsTable', 'venuesTable', 'clubsTable']) {
      expect(Object.hasOwn(BULK_DELETE_TARGETS, table)).toBe(false);
    }
  });
});
