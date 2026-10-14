/// <reference types="cypress" />
import { runMarker } from '@duncit/utils';
import { AUTH_REQUIRED, expectRefused, signInRunMember, type Refusal } from '../../../support/access-steps';
import {
  expectAnswer,
  expectEachRefused,
  FEATURE_DISABLED,
  productFlagOn,
  productRefusal,
} from '../../../support/api-partners';
import { runAccount } from '../../../support/run-account';
import { NO_ID } from '../../../support/staff-operations';

/**
 * Brand onboarding (partners-app /ecomm-brand — the Partner Brand product, not
 * the ecomm.duncit.com pet store). A brand is its owner's: `loadOwned`
 * (venues/ecommBrand/ecommBrand.service.ts) finds it by id AND owner, so
 * another owner's brand answers exactly like a missing one. Submitting needs a
 * name, a description and a contact email, checked in that order before the
 * brand is touched. Every brand operation sits behind the product flag, which
 * answers first while the shop is switched off. The one brand this spec
 * creates is the run account's own draft, marked with the run, and deleted.
 * Scenario map: Partners › Brand onboarding.
 */

const MY_BRANDS = `query E2eMyBrands { myEcommBrands { id } }`;
const MY_BRAND = `query E2eMyBrand($id: ID!) { myEcommBrand(brand_doc_id: $id) { id } }`;
const SAVE = `mutation E2eSaveBrand($input: EcommBrandInput!) { saveEcommBrand(input: $input) { id } }`;
const SUBMIT = `mutation E2eSubmitBrand($id: ID!) { submitEcommBrand(brand_doc_id: $id) { id } }`;
const DELETE = `mutation E2eDeleteMyBrand($id: ID!) { deleteMyEcommBrand(brand_doc_id: $id) }`;

const BRAND_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Brand not found' };

describe('API · A brand application is its owner’s, and submitted only when complete', { testIsolation: false }, () => {
  let memberToken = '';
  let flagOn = false;

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    productFlagOn().then((on) => {
      flagOn = on;
    });
  });

  it('BO-01 the brand list is refused signed out', () => {
    expectEachRefused('myEcommBrands', MY_BRANDS, {}, [[null, productRefusal(flagOn, AUTH_REQUIRED)]]);
  });

  it('BO-02 a brand the member does not own cannot be opened, submitted or deleted', () => {
    [
      ['myEcommBrand', MY_BRAND],
      ['submitEcommBrand', SUBMIT],
      ['deleteMyEcommBrand', DELETE],
    ].forEach(([field, query]) => {
      expectEachRefused(field, query, { id: NO_ID }, [[memberToken, productRefusal(flagOn, BRAND_NOT_FOUND)]]);
    });
  });

  it('BO-03 a draft with only a name is refused on submit, and the draft is then removed', () => {
    const input = { brand_name: runMarker(runAccount().stamp, 'api') };
    if (!flagOn) {
      // The shop is off: the save itself is refused, so nothing is created.
      expectEachRefused('saveEcommBrand', SAVE, { input }, [[memberToken, FEATURE_DISABLED]]);
      return;
    }
    cy.gql<{ saveEcommBrand: { id: string } }>(SAVE, { input }, { token: memberToken }).then(({ saveEcommBrand }) => {
      const id = saveEcommBrand.id;
      cy.gqlRaw(SUBMIT, { id }, { token: memberToken }).then((body) =>
        expectRefused('submitEcommBrand', body, { code: 'BAD_REQUEST', message: 'Add a brand description before submitting' }),
      );
      cy.gqlRaw(DELETE, { id }, { token: memberToken }).then((body) => expectAnswer('deleteMyEcommBrand', body, true));
      cy.gqlRaw(MY_BRANDS, {}, { token: memberToken }).then((body) => expectAnswer('myEcommBrands', body, []));
    });
  });
});
