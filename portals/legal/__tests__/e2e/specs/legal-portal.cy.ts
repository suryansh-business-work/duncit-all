/// <reference types="cypress" />

// Authenticated Legal-portal journeys. The shell loads `SessionMe` + branding;
// each test additionally mocks the GraphQL operations its screen fires.

const MANAGER = {
  user_id: 'legal-1',
  full_name: 'Lara Legal',
  first_name: 'Lara',
  last_name: 'Legal',
  email: 'lara@duncit.com',
  roles: ['LEGAL_MANAGER'],
  profile_photo: null,
};

const BRANDING = {
  branding: { app_name: 'Duncit', logo_url: '/duncit-logo.svg', primary_color: '#7c3aed', support_email: 'help@duncit.com' },
};

function shellMocks() {
  return {
    SessionMe: { data: { me: MANAGER } },
    AppBranding: { data: BRANDING },
  };
}

describe('Legal portal (authenticated)', () => {
  beforeEach(() => {
    cy.seedAuth();
  });

  it('shows the dashboard totals and by-type breakdown', () => {
    cy.mockGraphql({
      ...shellMocks(),
      LegalDocumentStats: {
        data: { legalDocumentStats: { total: 4, by_type: [{ document_type: 'Privacy Policy', count: 2 }, { document_type: 'NDA', count: 2 }] } },
      },
      LegalDocumentStatsTable: {
        data: { legalDocumentStatsTable: { total: 2, rows: [{ document_type: 'Privacy Policy', count: 2 }, { document_type: 'NDA', count: 2 }] } },
      },
    });
    cy.visit('/');
    cy.contains(/legal dashboard/i, { timeout: 10000 }).should('be.visible');
    cy.contains('Total documents').should('be.visible');
    cy.contains('Documents by type').should('be.visible');
  });

  it('lists documents and opens the new-document dialog with type picker + rich text', () => {
    const doc = {
      __typename: 'LegalDocument',
      id: 'd1',
      name: 'Master NDA',
      document_type: 'Non-Disclosure Agreement (NDA)',
      description: 'standard NDA',
      created_by_name: 'Lara',
      updated_by_name: 'Lara',
      version_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    cy.mockGraphql({ ...shellMocks(), LegalDocumentsTable: { data: { legalDocumentsTable: { total: 1, rows: [doc] } } } });
    cy.visit('/documents');
    cy.contains('Master NDA', { timeout: 10000 }).should('be.visible');
    cy.contains('button', /new document/i).click();
    cy.contains('New Document').should('be.visible');
    cy.get('[role="dialog"]').within(() => {
      cy.get('[role="combobox"]').should('exist'); // grouped, searchable type picker
      cy.get('.ql-editor').should('exist'); // rich-text editor
    });
  });

  it('shows the policies management screen', () => {
    const pol = {
      id: 'p1',
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      content: '<p>Body</p>',
      is_active: true,
      sort_order: 0,
      updated_at: new Date().toISOString(),
    };
    cy.mockGraphql({ ...shellMocks(), LegalPoliciesTable: { data: { policiesTable: { total: 1, rows: [pol] } } } });
    cy.visit('/policies');
    cy.contains('Policies', { timeout: 10000 }).should('be.visible');
    cy.contains('Privacy Policy').should('be.visible');
    cy.contains(/managed in one place/i).should('be.visible');
  });

  it('redirects an unauthorised role away from the portal', () => {
    cy.mockGraphql({
      SessionMe: { data: { me: { ...MANAGER, roles: ['USER'] } } },
      AppBranding: { data: BRANDING },
    });
    cy.visit('/');
    cy.location('pathname', { timeout: 10000 }).should('eq', '/login');
  });
});
