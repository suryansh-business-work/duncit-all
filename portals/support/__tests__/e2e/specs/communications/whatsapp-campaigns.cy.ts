import type { RunAccount } from '../../support/run-account';
import { consoleAccount, expectFirstRow, releaseConsoleRole, signIn, visitAndRead } from '../../support/ui-finance-crm';
import { countOperation, expectNotSent } from '../../support/ui-staff';

/**
 * Communications › WhatsApp campaigns (/whatsapp?selectedtab=<tab>), as a
 * COMMUNICATIONS_MANAGER seat. Strictly read-only: no campaign, template or
 * test message is ever sent, created, retried, cancelled or deleted — those
 * reach real people, so they are not scenarios this run may hold.
 *
 * The tab lives in the URL (`selectedtab`, @duncit/tabs useTabParam), so it
 * survives a reload. The page warns that AiSensy is missing exactly when
 * `waCampaignConfigured` is false (on every tab but Settings).
 */

const SENDS = ['SendWaCampaign', 'SendWaTestMessage', 'RetryWaCampaign', 'CancelWaCampaign'] as const;

describe('Communications · WhatsApp campaigns (run account, password CHANGED)', () => {
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

  it('MWA-01 the AiSensy warning shows exactly when WhatsApp is not configured', () => {
    visitAndRead<{ waCampaignConfigured: boolean }>('communications', '/whatsapp?selectedtab=campaigns', 'WaCampaignSetup').then(
      ({ waCampaignConfigured }) => {
        cy.byTestId('whatsapp-tab-campaigns').should('have.attr', 'aria-selected', 'true');
        cy.byTestId('whatsapp-not-configured').should(waCampaignConfigured ? 'not.exist' : 'be.visible');
      },
    );
  });

  it('MWA-02 the Logs tab lists every send and stays selected after a reload', () => {
    const counts = SENDS.map((name) => ({ name, seen: countOperation(name) }));
    visitAndRead<{ waLogs: { rows: { id: string; kind: string }[] } }>('communications', '/whatsapp?selectedtab=logs', 'WaLogs').then(
      ({ waLogs }) => {
        cy.byTestId('whatsapp-tab-logs').should('have.attr', 'aria-selected', 'true');
        // WaLogs keys a row by its kind and id (wa-logs/index.tsx).
        expectFirstRow('wa-logs', waLogs.rows, (r) => `${r.kind}-${r.id}`);
      },
    );
    cy.reload();
    cy.location('search').should('contain', 'selectedtab=logs');
    cy.byTestId('whatsapp-tab-logs').should('have.attr', 'aria-selected', 'true');
    for (const { name, seen } of counts) expectNotSent(seen, name);
  });
});
