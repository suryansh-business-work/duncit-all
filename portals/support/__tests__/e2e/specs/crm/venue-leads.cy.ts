import type { RunAccount } from '../../support/run-account';
import { consoleAccount, deleteMarkedLeads, leadScenarios, releaseConsoleRole, signIn } from '../../support/ui-finance-crm';
import { specMarker } from '../../support/ui-staff';

/**
 * CRM › Venue Leads (/venue-leads), as a CRM_MANAGER seat.
 *
 * Every lead this spec files carries `runMarker(stamp, 'crm-venue')` in its name,
 * a phone no person holds (`fakeLeadPhone`) and no email, so nothing is ever
 * called, messaged or verified; `after()` deletes every one of them. Real
 * leads are only ever read.
 */

describe('CRM · Venue Leads (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';

  before(() => {
    account = consoleAccount('crm');
    marker = specMarker(account, 'crm-venue');
  });

  beforeEach(() => {
    signIn('crm', account);
  });

  after(() => {
    if (marker) {
      signIn('crm', account);
      deleteMarkedLeads('venue', marker);
    }
    releaseConsoleRole(account, 'crm');
  });

  leadScenarios('venue', 'CVL', () => ({ account, marker }));
});
