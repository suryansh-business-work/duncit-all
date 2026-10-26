/// <reference types="cypress" />
import { expectRefused } from '../../../support/access-steps';
import { marked, refusal } from '../../../support/api-apps';
import type { GqlBody } from '../../../support/commands';
import {
  ensureDraftVenue,
  ensureHost,
  ensureVenue,
  signInRunPartner,
  type FixtureVenue,
} from '../../../support/fixture-world';

/**
 * Public pages, published by the run's own venue and host. Scenario map: Apps ›
 * Venue public page publish ("Publishing an unapproved venue is refused",
 * "Download the A4 poster and the table label PDF"), Host public page publish.
 *
 * publicPage.service.ts: a venue page is the caller's own venue, and only once
 * it is APPROVED and active; a host page needs the HOST role on the account.
 * Publishing mints one tracked share link per page (shortLink.service.ts
 * share), so asking again returns the same link. The poster and the table
 * label check their words before anything else, and come back as base64 PDF.
 * The share links are the run's (created_by) and go with the purge.
 */

const LINK = 'url code qr_data_url';
const PUBLISH = `mutation E2eFixturePublish($kind: PublicPageKind!, $ref: ID) {
  publishPublicPage(kind: $kind, ref_id: $ref) { ${LINK} }
}`;
const INSIGHTS = `query E2eFixturePublished($kind: PublicPageKind!, $ref: ID) {
  myPublicPage(kind: $kind, ref_id: $ref) { published link { code } }
}`;
const POSTER = `query E2eFixturePoster($kind: PublicPageKind!, $ref: ID, $copy: PublicPagePosterCopy!) {
  myPublicPagePosterPdfBase64(kind: $kind, ref_id: $ref, copy: $copy)
}`;
const LABEL = `query E2eFixtureTableLabel($venue: ID!, $headline: String!) {
  myVenueTableLabelPdfBase64(venue_id: $venue, headline: $headline)
}`;

/** "%PDF" in base64 — every PDF starts with it. */
const PDF_BASE64 = 'JVBERi';

interface PublishedLink {
  url: string;
  code: string;
  qr_data_url: string;
}

/** The call succeeded with a link whose QR is a PNG. Yields the link. */
function publishedLink(body: GqlBody): PublishedLink {
  expect(body.errors, 'publishPublicPage errors').to.be.undefined;
  const link = body.data?.publishPublicPage as PublishedLink;
  expect(link.url, 'link url').to.match(/^https?:\/\//);
  expect(link.code, 'link code').to.be.a('string').and.not.be.empty;
  expect(link.qr_data_url, 'link QR').to.match(/^data:image\/png;base64,/);
  return link;
}

/** The call succeeded with a base64 PDF. */
function expectPdf(field: string, body: GqlBody): void {
  expect(body.errors, `${field} errors`).to.be.undefined;
  expect(body.data?.[field], field).to.be.a('string').and.match(new RegExp(`^${PDF_BASE64}`));
}

describe('API · Public pages of the run’s own venue and host', { testIsolation: false }, () => {
  let token = '';
  let venue: FixtureVenue;
  let draft: FixtureVenue;
  let venueCode = '';
  const copy = { headline: marked('poster headline'), footer: marked('poster footer') };

  before(() => {
    signInRunPartner().then((partner) => {
      ensureVenue(partner).then((found) => {
        venue = found;
      });
      ensureHost(partner);
      ensureDraftVenue(partner).then((found) => {
        draft = found;
      });
    });
    // The host approval adds HOST to the account: sign in again for a token that carries it.
    signInRunPartner().then((partner) => {
      token = partner;
    });
  });

  it('VPB-01 the owner publishes the approved venue once: asking again returns the same link', () => {
    const vars = () => ({ kind: 'VENUE', ref: venue.id });
    cy.gqlRaw(PUBLISH, vars(), { token }).then((body) => {
      venueCode = publishedLink(body).code;
    });
    cy.gqlRaw(PUBLISH, vars(), { token }).then((body) => {
      expect(publishedLink(body).code, 'the same link').to.equal(venueCode);
    });
    cy.gql(INSIGHTS, vars(), { token }).then(({ myPublicPage }) => {
      expect(myPublicPage, 'myPublicPage').to.deep.equal({ published: true, link: { code: venueCode } });
    });
  });

  it('VPB-02 the A4 poster and the table label come back as PDFs, and need their words', () => {
    cy.gqlRaw(POSTER, { kind: 'VENUE', ref: venue.id, copy }, { token }).then((body) =>
      expectPdf('myPublicPagePosterPdfBase64', body),
    );
    cy.gqlRaw(POSTER, { kind: 'VENUE', ref: venue.id, copy: { ...copy, headline: '   ' } }, { token }).then((body) =>
      expectRefused('myPublicPagePosterPdfBase64', body, refusal('BAD_USER_INPUT', 'Poster text is required')),
    );
    cy.gqlRaw(LABEL, { venue: venue.id, headline: marked('table label') }, { token }).then((body) =>
      expectPdf('myVenueTableLabelPdfBase64', body),
    );
    cy.gqlRaw(LABEL, { venue: venue.id, headline: ' ' }, { token }).then((body) =>
      expectRefused('myVenueTableLabelPdfBase64', body, refusal('BAD_USER_INPUT', 'Label text is required')),
    );
  });

  it('VPB-03 a venue still in draft cannot be published, printed or read as published', () => {
    const unapproved = refusal('FAILED_PRECONDITION', 'A venue can be published once it is approved and active');
    cy.gqlRaw(PUBLISH, { kind: 'VENUE', ref: draft.id }, { token }).then((body) =>
      expectRefused('publishPublicPage', body, unapproved),
    );
    cy.gqlRaw(POSTER, { kind: 'VENUE', ref: draft.id, copy }, { token }).then((body) =>
      expectRefused('myPublicPagePosterPdfBase64', body, unapproved),
    );
    cy.gqlRaw(INSIGHTS, { kind: 'VENUE', ref: draft.id }, { token }).then((body) =>
      expectRefused('myPublicPage', body, unapproved),
    );
  });

  it('VPB-04 the approved host publishes a host page and reads it as published', () => {
    cy.gqlRaw(PUBLISH, { kind: 'HOST' }, { token }).then((body) => {
      const link = publishedLink(body);
      cy.gql(INSIGHTS, { kind: 'HOST' }, { token }).then(({ myPublicPage }) => {
        expect(myPublicPage, 'myPublicPage').to.deep.equal({ published: true, link: { code: link.code } });
      });
    });
  });
});
