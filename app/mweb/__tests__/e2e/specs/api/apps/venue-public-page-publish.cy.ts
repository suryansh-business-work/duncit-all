/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { foreignVenueId, memberId, refusal } from '../../../support/api-apps';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Venue public page publish — an owner publishes, prints and reads the numbers
 * of their own venues only. Scenario map: Apps › Venue public page publish
 * ("Owner cannot publish or print another owner's venue").
 *
 * publicPage.service.ts venueSubject loads the venue and answers someone
 * else's exactly like a missing one ("Venue not found"), before any share link
 * is minted; the table label's words are checked before the venue.
 */

const VENUE_NOT_FOUND = refusal('NOT_FOUND', 'Venue not found');

const PUBLISH = `mutation E2ePublishVenuePage($ref: ID) { publishPublicPage(kind: VENUE, ref_id: $ref) { url } }`;
const INSIGHTS = `query E2eVenuePageInsights($ref: ID) { myPublicPage(kind: VENUE, ref_id: $ref) { published } }`;
const POSTER = `query E2eVenuePoster($ref: ID, $copy: PublicPagePosterCopy!) {
  myPublicPagePosterPdfBase64(kind: VENUE, ref_id: $ref, copy: $copy)
}`;
const TABLE_LABEL = `query E2eTableLabel($venue: ID!, $headline: String!) {
  myVenueTableLabelPdfBase64(venue_id: $venue, headline: $headline)
}`;

const COPY = { headline: 'See what is on here', footer: 'Scan to book' };

describe("API · A venue's public page is its owner's to publish", { testIsolation: false }, () => {
  let memberToken = '';
  let venueId = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
      memberId(token).then((id) =>
        foreignVenueId(token, id).then((venue) => {
          venueId = venue;
        }),
      );
    });
  });

  it("VP-01 publishing another owner's venue answers like a venue that does not exist", () => {
    cy.gqlRaw(PUBLISH, { ref: venueId }, { token: null }).then((body) =>
      expectRefused('publishPublicPage', body, SIGNED_OUT),
    );
    cy.gqlRaw(PUBLISH, { ref: venueId }, { token: memberToken }).then((body) =>
      expectRefused('publishPublicPage', body, VENUE_NOT_FOUND),
    );
    cy.gqlRaw(PUBLISH, { ref: NO_ID }, { token: memberToken }).then((body) =>
      expectRefused('publishPublicPage', body, VENUE_NOT_FOUND),
    );
  });

  it("VP-02 another owner's page numbers are not readable", () => {
    cy.gqlRaw(INSIGHTS, { ref: venueId }, { token: memberToken }).then((body) =>
      expectRefused('myPublicPage', body, VENUE_NOT_FOUND),
    );
  });

  it("VP-03 another owner's poster cannot be printed", () => {
    cy.gqlRaw(POSTER, { ref: venueId, copy: COPY }, { token: memberToken }).then((body) =>
      expectRefused('myPublicPagePosterPdfBase64', body, VENUE_NOT_FOUND),
    );
  });

  it("VP-04 another owner's table label cannot be printed, and an empty label is refused first", () => {
    cy.gqlRaw(TABLE_LABEL, { venue: venueId, headline: 'Scan to order' }, { token: memberToken }).then((body) =>
      expectRefused('myVenueTableLabelPdfBase64', body, VENUE_NOT_FOUND),
    );
    cy.gqlRaw(TABLE_LABEL, { venue: venueId, headline: '   ' }, { token: memberToken }).then((body) =>
      expectRefused('myVenueTableLabelPdfBase64', body, refusal('BAD_USER_INPUT', 'Label text is required')),
    );
  });
});
