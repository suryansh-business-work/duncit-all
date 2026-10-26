/// <reference types="cypress" />
import { publicPagePosterFileName, publicPageTableLabelFileName } from '@duncit/utils';
import { draftOf, partnerWorld, signInRunPartner, visitWithVenue, type PartnerWorld } from '../../support/ui-partners-3';

/**
 * Publish page, live (scenario map › Partners › Publish page), on the run's
 * own approved venue, its draft venue and its host profile.
 *
 * /venues/publish and /host/publish (src/pages/publish-page) mount
 * @duncit/public-page's PublishPageCard: Publish once (`publishPublicPage`
 * mints one tracked share link per page, so asking again returns the same
 * one), then the link, its QR, the A4 poster and — for a venue only — the
 * table label. A venue that is not approved gets the reason instead of the
 * card. The share links are the run's (created_by) and go with the purge
 * (server e2eRun.purge.ts).
 */

const PUBLISHED = `query E2eUiP3PublicPage($kind: PublicPageKind!, $ref: ID) {
  myPublicPage(kind: $kind, ref_id: $ref) { published link { url code } }
}`;
const PUBLISH = `mutation E2eUiP3Publish($kind: PublicPageKind!, $ref: ID) {
  publishPublicPage(kind: $kind, ref_id: $ref) { url code }
}`;

/** "%PDF" in base64 — every PDF starts with it. */
const PDF_BASE64 = /^JVBERi/;

type Kind = 'VENUE' | 'HOST';

interface Page {
  published: boolean;
  link: { url: string; code: string } | null;
}

const pageOf = (kind: Kind, ref: string | null): Cypress.Chainable<Page> =>
  cy.gql<{ myPublicPage: Page }>(PUBLISHED, { kind, ref }).then((data) => data.myPublicPage);

/**
 * On an open publish card: press Publish when the page is not published yet,
 * then the card shows the published link — the same one the server holds, and
 * the same one a second publish returns.
 */
function expectPublished(kind: Kind, ref: string | null): void {
  pageOf(kind, ref).then((before) => {
    if (!before.published) {
      cy.interceptOperation('PublishPublicPage');
      cy.byTestId('public-page-publish').should('have.text', 'Publish').click();
      cy.wait('@PublishPublicPage');
    }
    cy.byTestId('public-page-published').should('have.text', 'Published');
    cy.byTestId('public-page-qr').should('have.attr', 'src').and('match', /^data:image\/png;base64,/);
    pageOf(kind, ref).then((after) => {
      expect(after.published, 'published on the server').to.equal(true);
      cy.byTestId('public-page-link').should('have.value', after.link?.url);
      if (before.published) expect(after.link?.code, 'the link it already had').to.equal(before.link?.code);
      cy.gql<{ publishPublicPage: { code: string } }>(PUBLISH, { kind, ref }).then(({ publishPublicPage }) => {
        expect(publishPublicPage.code, 'publishing again returns the same link').to.equal(after.link?.code);
      });
    });
  });
}

/** Press `button`, wait for `operation`, and expect a base64 PDF back and the file saved as `fileName`. */
function expectPdfDownload(button: string, operation: string, field: string, fileName: string): void {
  cy.interceptOperation(operation);
  cy.byTestId(button).click();
  cy.wait(`@${operation}`).its(`response.body.data.${field}`).should('match', PDF_BASE64);
  cy.readFile(`${Cypress.config('downloadsFolder')}/${fileName}`, 'binary').should('match', /^%PDF/);
}

describe('Partners · Publish page (the run’s venue, draft venue and host page)', () => {
  let world: PartnerWorld;

  before(() => {
    signInRunPartner();
    partnerWorld().then((found) => {
      world = found;
    });
  });

  beforeEach(() => {
    signInRunPartner();
  });

  it('PB-01 the approved venue publishes once: the card shows the tracked link and QR, and publishing again returns the same link', () => {
    cy.interceptOperation('MyPublicPage');
    visitWithVenue('/venues/publish', world.venue.id);
    cy.wait('@MyPublicPage');
    cy.byTestId('venue-picker').should('have.value', world.venue.id);
    cy.byTestId('public-page-title').should('have.text', 'Publish your venue');
    expectPublished('VENUE', world.venue.id);
  });

  it('PB-02 the venue’s A4 poster and table label download as PDFs named after the venue', () => {
    cy.interceptOperation('MyPublicPage');
    visitWithVenue('/venues/publish', world.venue.id);
    cy.wait('@MyPublicPage');
    expectPublished('VENUE', world.venue.id);
    cy.byTestId('public-page-download-poster').should('have.text', 'Download A4 poster');
    expectPdfDownload(
      'public-page-download-poster',
      'MyPublicPagePoster',
      'myPublicPagePosterPdfBase64',
      publicPagePosterFileName(world.venue.name),
    );
    cy.byTestId('public-page-download-table-label').should('have.text', 'Download table label');
    expectPdfDownload(
      'public-page-download-table-label',
      'MyVenueTableLabel',
      'myVenueTableLabelPdfBase64',
      publicPageTableLabelFileName(world.venue.name),
    );
  });

  it('PB-03 a venue that is not approved explains why and offers no publish card', () => {
    cy.interceptOperation('MyVenues');
    visitWithVenue('/venues/publish', draftOf(world).id);
    cy.wait('@MyVenues');
    cy.byTestId('venue-picker').should('have.value', draftOf(world).id);
    cy.byTestId('venue-publish-needs-approval').should('have.text', 'Your venue can be published once it is approved.');
    cy.byTestId('public-page-card').should('not.exist');
  });

  it('PB-04 the approved host publishes the host page, which offers the poster but no table label', () => {
    cy.interceptOperation('MyPublicPage');
    cy.visitApp('/host/publish');
    cy.wait('@MyPublicPage');
    cy.byTestId('host-publish-page').should('be.visible');
    cy.byTestId('public-page-title').should('have.text', 'Publish your host page');
    expectPublished('HOST', null);
    cy.byTestId('public-page-download-poster').should('be.visible');
    cy.byTestId('public-page-download-table-label').should('not.exist');
  });
});
