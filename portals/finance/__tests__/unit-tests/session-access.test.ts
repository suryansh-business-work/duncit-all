import { describe, expect, it } from 'vitest';
import { appConfig } from '../../src/config/app-config';

/**
 * Who signs in to the Finance console. FINANCE_USER is the read-only analyst
 * seat — the server admits it to every Finance read and refuses every write —
 * so the console has to let it in, or the role grants nothing. (The shell is
 * mocked in this suite; the role gate itself is `createSession`'s, tested in
 * @duncit/shell.)
 */
describe('Finance console access', () => {
  it('admits the manager and the read-only analyst seat by default, manager first', () => {
    expect(appConfig.requiredRoles).toEqual(['FINANCE_MANAGER', 'FINANCE_USER']);
  });

  it('does not open to the platform admins or other consoles’ seats', () => {
    for (const role of ['CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER', 'ECOMM_MANAGER']) {
      expect(appConfig.requiredRoles).not.toContain(role);
    }
  });
});
