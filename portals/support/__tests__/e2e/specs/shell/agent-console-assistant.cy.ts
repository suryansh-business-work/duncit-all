import type { RunAccount } from '../../support/run-account';
import { AGENT_AVAILABILITY_API, apiToken, asAccount, openSignedIn, runPasswordNow } from '../../support/ui-shell';
import { gqlRaw, staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Agent console assistant: the thread is never kept — closing
 * the drawer drops it, and a reopened Agent starts empty with its greeting and
 * suggestions — and the server refuses an empty instruction before any model
 * is asked (agent.service.ts chat). Nothing is sent to OpenAI from here.
 */

const AGENT_CHAT_API = `mutation E2eAgentChat($input: AgentChatInput!) {
  agentChat(input: $input) { answer created }
}`;

describe('Portal Shell · Agent console assistant (Support, run account)', () => {
  let account: RunAccount;
  let available = false;

  before(() => {
    account = staffAccount();
    apiToken('support', account).then((token) =>
      asAccount<{ agentAvailability: { is_available: boolean } }>('support', token, AGENT_AVAILABILITY_API).then((data) => {
        available = data.agentAvailability.is_available;
      }),
    );
  });

  it('ACA-01 closing the Agent brings the tab back, and a reopened Agent starts with an empty thread', () => {
    if (!available) throw new Error('The Agent has no OpenAI key on staging (agentAvailability is_available false); its composer is disabled.');
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
    openSignedIn('support', '/');
    cy.byTestId('shell-agent-dock-tab').click();
    cy.byTestId('shell-agent-composer').type('create 3 pods');
    cy.byTestId('shell-agent-send').should('be.enabled');
    cy.byTestId('shell-agent-close').click();
    cy.byTestId('shell-agent-thread').should('not.exist');
    cy.byTestId('shell-agent-dock-tab').should('be.visible').click();
    cy.byTestId('shell-agent-composer').should('have.value', '');
    cy.byTestId('shell-agent-thread').should('contain.text', 'Try asking').and('contain.text', 'Create 5 pods');
    cy.byTestId('shell-agent-restart').should('be.visible');
  });

  it('ACA-02 an empty or blank instruction is refused by the server and creates nothing', () => {
    apiToken('support', account).then((token) => {
      for (const message of ['', '    ']) {
        gqlRaw<{ agentChat: unknown }>('support', AGENT_CHAT_API, { input: { message, history: [] } }, token).then((body) => {
          expect(body.errors?.[0]?.message, `agentChat with ${JSON.stringify(message)}`).to.equal(
            'Type what you would like the agent to do',
          );
          expect(body.data?.agentChat ?? null).to.be.null;
        });
      }
    });
  });
});
