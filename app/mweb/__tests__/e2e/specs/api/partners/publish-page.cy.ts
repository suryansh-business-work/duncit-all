/// <reference types="cypress" />
import { signInRunMember, SIGNED_OUT, type Refusal } from '../../../support/access-steps';
import { expectEachRefused, foreignVenueId } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Publish page (/venues/publish) — a venue's public page, its poster and its
 * table label are published by the venue's owner only, and a host page by an
 * approved host only (venues/publicPage/publicPage.service.ts). Someone else's
 * venue answers exactly like a missing one — "Venue not found" — so the
 * refusal cannot be used to probe ids, and it comes before any link is made.
 * Scenario map: Partners › Publish page.
 */

const PUBLISH = `mutation E2ePublishPage($kind: PublicPageKind!, $ref_id: ID) {
  publishPublicPage(kind: $kind, ref_id: $ref_id) { url }
}`;
const INSIGHTS = `query E2eMyPublicPage($kind: PublicPageKind!, $ref_id: ID) {
  myPublicPage(kind: $kind, ref_id: $ref_id) { published }
}`;
const POSTER = `query E2ePosterPdf($ref_id: ID) {
  myPublicPagePosterPdfBase64(kind: VENUE, ref_id: $ref_id, copy: { headline: "E2E", footer: "E2E" })
}`;
const TABLE_LABEL = `query E2eTableLabelPdf($venue_id: ID!) { myVenueTableLabelPdfBase64(venue_id: $venue_id, headline: "E2E") }`;

const VENUE_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Venue not found' };

describe('API · Only the owner publishes a venue page, poster or table label', { testIsolation: false }, () => {
  let memberToken = '';
  let foreignId = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    foreignVenueId().then((id) => {
      foreignId = id;
    });
  });

  it('PP-01 publishing or reading a venue page is refused signed out', () => {
    expectEachRefused('publishPublicPage', PUBLISH, { kind: 'VENUE', ref_id: foreignId }, [[null, SIGNED_OUT]]);
    expectEachRefused('myPublicPage', INSIGHTS, { kind: 'VENUE', ref_id: foreignId }, [[null, SIGNED_OUT]]);
  });

  it('PP-02 another owner’s venue cannot be published, and answers exactly like a missing one', () => {
    [foreignId, NO_ID].forEach((venueId) => {
      expectEachRefused('publishPublicPage', PUBLISH, { kind: 'VENUE', ref_id: venueId }, [
        [memberToken, VENUE_NOT_FOUND],
      ]);
      expectEachRefused('myPublicPage', INSIGHTS, { kind: 'VENUE', ref_id: venueId }, [[memberToken, VENUE_NOT_FOUND]]);
    });
  });

  it('PP-03 another owner’s poster and table label cannot be printed', () => {
    expectEachRefused('myPublicPagePosterPdfBase64', POSTER, { ref_id: foreignId }, [[memberToken, VENUE_NOT_FOUND]]);
    expectEachRefused('myVenueTableLabelPdfBase64', TABLE_LABEL, { venue_id: foreignId }, [
      [null, SIGNED_OUT],
      [memberToken, VENUE_NOT_FOUND],
    ]);
  });

  it('PP-04 a member who is not an approved host cannot publish a host page', () => {
    expectEachRefused('publishPublicPage', PUBLISH, { kind: 'HOST' }, [
      [memberToken, { code: 'FORBIDDEN', message: 'Only an approved host can publish a host page' }],
    ]);
  });
});
