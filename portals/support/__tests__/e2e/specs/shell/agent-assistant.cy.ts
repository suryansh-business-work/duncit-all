import type { RunAccount } from '../../support/run-account';
import {
  AGENT_AVAILABILITY_API,
  apiToken,
  asAccount,
  openSignedIn,
  readWorkspace,
  restoreWorkspace,
  runPasswordNow,
  type WorkspaceDto,
} from '../../support/ui-shell';
import { staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Agent assistant (the dock tab every console renders): the
 * drawer says what this caller may do — `agentAvailability` (no OpenAI key →
 * the not-configured warning and a disabled composer; a role outside
 * AGENT_ACT_ROLES → "can ask but not create") — and the tab sits where the
 * workspace's `agent_edge` / `agent_offset` put it, in every console.
 *
 * Nothing is asked of the Agent here: a turn reaches OpenAI, and an acting
 * role would create real pods. The workspace is restored in `after()`.
 */

interface Availability {
  agentAvailability: { is_available: boolean; can_act: boolean };
}

describe('Portal Shell · Agent assistant (Support and Legal, run account)', () => {
  let account: RunAccount;
  let availability: Availability['agentAvailability'] | null = null;
  let saved: WorkspaceDto | null = null;

  before(() => {
    account = staffAccount();
    apiToken('support', account).then((token) => {
      asAccount<Availability>('support', token, AGENT_AVAILABILITY_API).then((data) => {
        availability = data.agentAvailability;
      });
      readWorkspace('support', token).then((state) => {
        saved = state;
      });
    });
  });

  after(() => {
    if (!account || !saved) return;
    const state = saved;
    apiToken('support', account).then((token) => restoreWorkspace('support', token, state));
  });

  it('AA-01 the drawer opens over the page, hides the tab, and states what this role may do', () => {
    const can = availability;
    if (!can) throw new Error('agentAvailability did not answer for the run account.');
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
    openSignedIn('support', '/tickets');
    cy.byTestId('shell-agent-dock-tab').should('be.visible').click();
    cy.byTestId('shell-agent-dock-tab').should('not.exist');
    cy.byTestId('shell-agent-thread').should('contain.text', 'Ask me to create pods or clubs');
    cy.location('pathname').should('eq', '/tickets');
    // Support, Legal and Pods roles are outside AGENT_ACT_ROLES (agent.types.ts).
    expect(can.can_act, 'the run account may not create through the Agent').to.equal(false);
    if (can.is_available) {
      cy.byTestId('shell-agent-not-configured').should('not.exist');
      cy.byTestId('shell-agent-read-only').should(
        'have.text',
        'You can ask the agent questions, but your role cannot create things yet.',
      );
      cy.byTestId('shell-agent-composer').should('be.enabled');
      cy.byTestId('shell-agent-send').should('be.disabled');
      cy.byTestId('shell-agent-composer').type('   ');
      cy.byTestId('shell-agent-send').should('be.disabled');
    } else {
      cy.byTestId('shell-agent-not-configured').should(
        'have.text',
        'Not ready yet — a tech admin needs to add the OpenAI key in the Tech portal.',
      );
      cy.byTestId('shell-agent-composer').should('be.disabled');
    }
  });

  it('AA-02 the tab sits on the edge the workspace saved, in another console too', () => {
    apiToken('legal', account).then((token) =>
      readWorkspace('legal', token).then((state) =>
        restoreWorkspace('legal', token, { ...state, agent_edge: 'LEFT', agent_offset: 0 }),
      ),
    );
    cy.apiPortalLogin('legal', account.email, runPasswordNow(account));
    cy.interceptOperation('ShellWorkspaceState');
    openSignedIn('legal', '/');
    cy.wait('@ShellWorkspaceState');
    cy.byTestId('shell-agent-dock-tab').should('have.css', 'left', '0px').and('have.css', 'top', '0px');

    apiToken('legal', account).then((token) =>
      readWorkspace('legal', token).then((state) =>
        restoreWorkspace('legal', token, { ...state, agent_edge: 'RIGHT', agent_offset: 0 }),
      ),
    );
    cy.reload();
    cy.byTestId('shell-agent-dock-tab').should('have.css', 'right', '0px');
  });
});
