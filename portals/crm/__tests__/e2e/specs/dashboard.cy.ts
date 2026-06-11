import { baseMocks, loginSuccess } from '../support/fixtures';

describe('Dashboard', () => {
  beforeEach(() => {
    cy.mockGraphql({ ...baseMocks(), ConsoleLogin: loginSuccess });
    cy.login();
  });

  it('renders the KPI tiles', () => {
    cy.contains(/venue leads/i).should('be.visible');
    cy.contains(/host leads/i).should('be.visible');
    cy.contains(/total leads/i).should('be.visible');
    cy.contains(/won %/i).should('be.visible');
    cy.contains(/services offered/i).should('be.visible');
  });

  it('renders each chart card', () => {
    cy.contains(/leads by stage/i).should('be.visible');
    cy.contains(/leads by priority/i).should('be.visible');
    cy.contains(/leads by super category/i).should('be.visible');
    cy.contains(/services mix/i).should('be.visible');
  });

  it('shows a range filter', () => {
    cy.contains('button', /today|this week|this month|this year|all time/i).should('exist');
  });
});
