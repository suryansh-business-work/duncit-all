import type { RunAccount } from '../../support/run-account';
import { consoleAccount, releaseConsoleRole, signIn, visitAndRead } from '../../support/ui-finance-crm';

/**
 * Communications › MSG91 OTP (/msg91-otp → /msg91-otp/logs), as a
 * COMMUNICATIONS_MANAGER seat. Read-only: no code is sent and the sender
 * settings are never saved.
 *
 * The logs page asks nothing of MSG91 until `msg91Configured` says it is set
 * up (useMsg91Report.ts); once it is, the window's logs answer this seat
 * (MSG91_READ in msg91.resolver.ts) and never list more rows than they count.
 */

describe('Communications · MSG91 OTP (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = consoleAccount('communications');
  });

  beforeEach(() => {
    signIn('communications', account);
  });

  after(() => {
    releaseConsoleRole(account, 'communications');
  });

  it('MOT-01 /msg91-otp opens the logs, which are only asked for once MSG91 is configured', () => {
    cy.interceptOperation('Msg91WidgetLogs');
    visitAndRead<{ msg91Configured: boolean }>('communications', '/msg91-otp', 'Msg91Configured').then(({ msg91Configured }) => {
      cy.location('pathname').should('eq', '/msg91-otp/logs');
      if (!msg91Configured) return;
      cy.wait('@Msg91WidgetLogs').then(({ response }) => {
        expect(response?.body.errors, 'the window\'s logs answer this seat').to.be.undefined;
        const page = response?.body.data.msg91WidgetLogs as { total: number; rows: unknown[] };
        expect(page.rows.length, 'a page never lists more than it counts').to.be.at.most(page.total);
      });
    });
  });
});
