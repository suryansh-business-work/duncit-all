/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunAs, signInRunMember } from '../../../support/access-steps';
import { expectPortalOpens, expectPortalRefused } from '../../../support/api-partners';

/**
 * The server-side sign-in gate of the Developers, Localization, Tech and Tests
 * consoles (modules/portals/portal.gate.ts assertPortalLogin over
 * portal.constants.ts PORTAL_ROLE_REQUIREMENTS: developers DEVELOPERS_MANAGER,
 * localization LOCALIZATION_MANAGER, tech TECH_MANAGER, tests TESTS_MANAGER;
 * SUPER_ADMIN passes every portal). The run account signs in with its real
 * password, so each refusal is the portal gate ("You do not have access to this
 * portal"), never a wrong password — and the console it does hold opens in the
 * same run, proving the credentials. None of the four roles can be granted to a
 * run account, so the admitted half is not automated. Scenario map: Staff ›
 * Developers: Dashboard "login refused for accounts without DEVELOPERS_MANAGER",
 * Localization: Access "login refused for roles outside requiredRoles".
 */

const GATED = ['developers', 'localization', 'tech', 'tests'] as const;
const ROLES: readonly E2eStaffRole[] = ['SUPPORT_USER', 'LOGS_MANAGER'];

const expectGatedRefused = () => GATED.forEach((portal) => expectPortalRefused(portal));

describe('API · Developers, Localization, Tech and Tests sign-in refuses other accounts', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('CL-01 a plain member is refused all four consoles', () => {
    expectGatedRefused();
  });

  it('CL-02 SUPPORT_USER opens Support but is refused all four consoles', () => {
    signInRunAs(['SUPPORT_USER']);
    expectPortalOpens('support');
    expectGatedRefused();
    revokeRunRoles(['SUPPORT_USER']);
  });

  it('CL-03 LOGS_MANAGER opens Logs but is refused all four consoles', () => {
    signInRunAs(['LOGS_MANAGER']);
    expectPortalOpens('logs');
    expectGatedRefused();
    revokeRunRoles(['LOGS_MANAGER']);
  });
});
