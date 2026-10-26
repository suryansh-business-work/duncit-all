import type { RunAccount } from '../../support/run-account';
import { ASK_BOTS_API, apiToken, asAccount, openAppsTool, openSignedIn, runPasswordNow } from '../../support/ui-shell';
import { staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Ask Bot (apps drawer), on Support: the bot list follows
 * `askBots` (a bot without its OpenAI key is shown disabled with the reason),
 * the Navigation Knowledge Bot's chat sends the question with the thread so far
 * as history, Start over empties the thread, All bots goes back, and nothing is
 * kept once the dialog closes. A list that cannot load says so.
 *
 * Not asserted: the wording of the bot's answer (it is the model's), nor the
 * phone-chip links, which need an answer that happens to name an app-only page.
 */

const NAV_BOT = 'navigation';

describe('Portal Shell · Ask Bot (Support, run account)', () => {
  let account: RunAccount;
  let available = false;

  before(() => {
    account = staffAccount();
    apiToken('support', account).then((token) =>
      asAccount<{ askBots: { key: string; is_available: boolean }[] }>('support', token, ASK_BOTS_API).then((data) => {
        const bot = data.askBots.find((row) => row.key === NAV_BOT);
        if (!bot) throw new Error('askBots does not list the navigation bot on staging.');
        available = bot.is_available;
      }),
    );
  });

  beforeEach(() => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
  });

  it('AB-01 the list shows the Navigation Knowledge Bot as ready or explains why it is not', () => {
    openSignedIn('support', '/');
    openAppsTool('ask-bot');
    cy.byTestId('ask-bot-dialog')
      .should('contain.text', 'Ask Bot')
      .and('contain.text', 'Pick a bot to talk to. More will appear here as they are built.');
    cy.byTestId(`ask-bot-row-${NAV_BOT}`).should('contain.text', 'Navigation Knowledge Bot');
    if (available) {
      cy.byTestId(`ask-bot-row-${NAV_BOT}`).should('not.have.class', 'Mui-disabled').and('not.contain.text', 'Unavailable');
    } else {
      cy.byTestId(`ask-bot-row-${NAV_BOT}`)
        .should('have.class', 'Mui-disabled')
        .and('contain.text', 'Not ready yet — a tech admin needs to add the OpenAI key in the Tech portal.')
        .and('contain.text', 'Unavailable');
    }
  });

  it('AB-02 a question is sent with the thread as history; Start over and All bots reset, and closing forgets it', () => {
    if (!available) throw new Error('The navigation bot has no OpenAI key on staging (askBots is_available false); the chat cannot be reached.');
    openSignedIn('support', '/');
    openAppsTool('ask-bot');
    cy.byTestId(`ask-bot-row-${NAV_BOT}`).click();
    cy.byTestId('ask-bot-dialog').should('contain.text', 'Ask me where anything lives on Duncit.');
    cy.byTestId('ask-bot-dialog').should('contain.text', 'Where do I approve a venue?');
    cy.byTestId('ask-bot-send').should('be.disabled');

    cy.interceptOperation('AskBotChat');
    cy.byTestId('ask-bot-composer').type('Where do I read support tickets?');
    cy.byTestId('ask-bot-send').should('be.enabled').click();
    cy.byTestId('ask-bot-send').should('be.disabled');
    cy.byTestId('ask-bot-message-user').should('contain.text', 'Where do I read support tickets?');
    cy.wait('@AskBotChat', { timeout: 60000 }).its('request.body.variables.input').should((input) => {
      expect(input.bot_key).to.equal(NAV_BOT);
      expect(input.message).to.equal('Where do I read support tickets?');
      expect(input.history, 'the first question has no history').to.deep.equal([]);
    });

    cy.byTestId('ask-bot-restart').click();
    cy.byTestIdPrefix('ask-bot-message-').should('not.exist');
    cy.byTestId('ask-bot-dialog').should('contain.text', 'Try asking');
    cy.byTestId('ask-bot-back').click();
    cy.byTestId(`ask-bot-row-${NAV_BOT}`).should('be.visible');

    cy.byTestId(`ask-bot-row-${NAV_BOT}`).click();
    cy.byTestId('ask-bot-close').click();
    cy.byTestId('ask-bot-dialog').should('not.exist');
    openAppsTool('ask-bot');
    cy.byTestId(`ask-bot-row-${NAV_BOT}`).should('be.visible');
    cy.byTestId('ask-bot-composer').should('not.exist');
  });

  it('AB-03 a bot list that cannot load says so', () => {
    cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
      if ((req.body as { operationName?: string } | undefined)?.operationName === 'AskBots') {
        req.reply({ statusCode: 200, body: { errors: [{ message: 'E2E: bots unavailable' }] } });
      }
    });
    openSignedIn('support', '/');
    openAppsTool('ask-bot');
    cy.byTestId('ask-bot-dialog').should('contain.text', 'Could not load the bots. Please try again.');
    cy.byTestIdPrefix('ask-bot-row-').should('not.exist');
  });
});
