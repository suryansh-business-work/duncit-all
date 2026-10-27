/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { refusal } from '../../../support/api-apps';

/**
 * Host public page publish — only an approved host has a host page to publish,
 * print or read the numbers of. Scenario map: Apps › Host public page publish
 * ("USER without HOST cannot publish a host page").
 *
 * publicPage.service.ts hostSubject reads the roles from the account, not the
 * token (a stale token cannot widen it), and refuses before a share link is
 * minted. The poster's words are checked first (cleanCopy), so empty words are
 * refused for anyone.
 */

const NOT_HOST = refusal('FORBIDDEN', 'Only an approved host can publish a host page');

const PUBLISH = `mutation E2ePublishHostPage { publishPublicPage(kind: HOST) { url } }`;
const INSIGHTS = `query E2eHostPageInsights { myPublicPage(kind: HOST) { published } }`;
const POSTER = `query E2eHostPoster($copy: PublicPagePosterCopy!) {
  myPublicPagePosterPdfBase64(kind: HOST, copy: $copy)
}`;

const COPY = { headline: 'Meet me at my next pod', footer: 'Scan to see my pods' };

describe('API · A member without host access has no host page', { testIsolation: false }, () => {
  let memberToken = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  it('HP-01 publishing a host page is refused signed out and to a member', () => {
    cy.gqlRaw(PUBLISH, {}, { token: null }).then((body) => expectRefused('publishPublicPage', body, SIGNED_OUT));
    cy.gqlRaw(PUBLISH, {}, { token: memberToken }).then((body) => expectRefused('publishPublicPage', body, NOT_HOST));
  });

  it("HP-02 a member cannot read a host page's numbers", () => {
    cy.gqlRaw(INSIGHTS, {}, { token: memberToken }).then((body) => expectRefused('myPublicPage', body, NOT_HOST));
  });

  it('HP-03 a member cannot print a host poster, and empty poster words are refused first', () => {
    cy.gqlRaw(POSTER, { copy: COPY }, { token: memberToken }).then((body) =>
      expectRefused('myPublicPagePosterPdfBase64', body, NOT_HOST),
    );
    cy.gqlRaw(POSTER, { copy: { headline: '  ', footer: COPY.footer } }, { token: memberToken }).then((body) =>
      expectRefused('myPublicPagePosterPdfBase64', body, refusal('BAD_USER_INPUT', 'Poster text is required')),
    );
  });
});
