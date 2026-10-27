import type { RunAccount } from '../../support/run-account';
import { consoleAccount, releaseConsoleRole, signIn, visitAndRead } from '../../support/ui-finance-crm';
import { countOperation, expectNotSent } from '../../support/ui-staff';

/**
 * Communications › WhatsApp automation (/whatsapp?selectedtab=automation), as
 * a COMMUNICATIONS_MANAGER seat. Read-only.
 *
 * The board lists one row per platform-sent scenario in WA_EVENTS
 * (server whatsapp.events.generated.ts, row key = event_key), the eight venue
 * food and events scenarios among them. Provisioning a template, switching a
 * scenario or the kill switch, reconciling and setting header media all change
 * what real members receive, so this spec only reads the board and proves none
 * of those writes is sent.
 */

const TABLE = 'wa-automation-scenarios';

/** The venue food & events scenarios (whatsapp.events.generated.ts). */
const VENUE_SCENARIOS = [
  'VENUE_FOOD_ORDER_PLACED',
  'VENUE_FOOD_ORDER_READY',
  'VENUE_FOOD_ORDER_SERVED',
  'VENUE_FOOD_ORDER_CANCELLED',
  'VENUE_FOOD_ORDER_RECEIVED',
  'VENUE_FOOD_FEEDBACK_RECEIVED',
  'VENUE_EVENTS_SUBSCRIBED',
  'VENUE_NEW_EVENT',
] as const;

const WRITES = [
  'ProvisionWhatsappScenario',
  'SetWhatsappScenarioEnabled',
  'ReconcileWhatsappScenarios',
  'SetWhatsappDefaultMedia',
  'SetWhatsappScenarioMedia',
] as const;

interface ScenarioBoard {
  whatsappScenarios: { global_enabled: boolean; rows: { event_key: string; enabled: boolean }[] };
}

describe('Communications · WhatsApp automation (run account, password CHANGED)', () => {
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

  it('MWS-01 the board lists the eight venue food and events scenarios, and opening it writes nothing', () => {
    const writes = WRITES.map((name) => ({ name, seen: countOperation(name) }));
    visitAndRead<ScenarioBoard>('communications', '/whatsapp?selectedtab=automation', 'WhatsappScenarios').then(
      ({ whatsappScenarios }) => {
        cy.byTestId('whatsapp-tab-automation').should('have.attr', 'aria-selected', 'true');
        const keys = whatsappScenarios.rows.map((r) => r.event_key);
        expect(keys, 'the venue scenarios are on the board').to.include.members([...VENUE_SCENARIOS]);
        expect(new Set(keys).size, 'each scenario is listed once').to.equal(keys.length);
        cy.byTestId(`${TABLE}-row-${whatsappScenarios.rows[0]?.event_key}`).should('exist');
      },
    );
    for (const { name, seen } of writes) expectNotSent(seen, name);
  });
});
