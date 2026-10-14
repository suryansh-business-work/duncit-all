/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { refusal } from '../../../support/api-apps';

/**
 * Referrals — every member gets a code of their own, and the server refuses an
 * empty, unknown or own code before anything is linked or paid. Scenario map:
 * Apps › Referrals ("View and share your referral code", "Referral code
 * rejected").
 *
 * referral.service.ts myReferral mints the code on first read and returns the
 * same one after; applyCode normalises the code to upper case and validateCode
 * refuses it before link() records a referral or credits a coin. The run
 * account signed up with the referral box cleared (01-signup SU-12), so nobody
 * referred it, and it has shared its code with nobody.
 */

const MY_REFERRAL = `query E2eMyReferral { myReferral { code referred { user_id } referred_by_name } }`;
const APPLY = `mutation E2eApplyReferral($code: String!) { applyReferralCode(code: $code) { code } }`;

interface MyReferral {
  code: string;
  referred: Array<{ user_id: string }>;
  referred_by_name: string | null;
}

/** A shape generateCode (DUN- + six hex digits) can never produce, so no account owns it. */
const UNKNOWN_CODE = 'E2E-NOCODE';

describe('API · A referral code is the member’s own and cannot be self-applied', { testIsolation: false }, () => {
  let memberToken = '';
  let ownCode = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
  });

  it('RF-01 a signed-out caller has no referral code', () => {
    cy.gqlRaw(MY_REFERRAL, {}, { token: null }).then((body) => expectRefused('myReferral', body, SIGNED_OUT));
  });

  it('RF-02 the member has one stable code, has referred nobody and was referred by nobody', () => {
    cy.gql<{ myReferral: MyReferral }>(MY_REFERRAL, {}, { token: memberToken }).then(({ myReferral }) => {
      expect(myReferral.code).to.match(/^DUN-[0-9A-F]{6}$/);
      expect(myReferral.referred).to.deep.equal([]);
      expect(myReferral.referred_by_name).to.be.null;
      ownCode = myReferral.code;
    });
    cy.gql<{ myReferral: MyReferral }>(MY_REFERRAL, {}, { token: memberToken }).then(({ myReferral }) => {
      expect(myReferral.code, 'the same code on every read').to.equal(ownCode);
    });
  });

  it('RF-03 the member cannot redeem their own code, however it is typed', () => {
    const own = refusal('BAD_USER_INPUT', 'You cannot redeem your own code');
    cy.gqlRaw(APPLY, { code: ownCode }, { token: memberToken }).then((body) =>
      expectRefused('applyReferralCode', body, own),
    );
    cy.gqlRaw(APPLY, { code: ` ${ownCode.toLowerCase()} ` }, { token: memberToken }).then((body) =>
      expectRefused('applyReferralCode', body, own),
    );
  });

  it('RF-04 an unknown or empty code is refused, and signed out nothing is applied', () => {
    cy.gqlRaw(APPLY, { code: UNKNOWN_CODE }, { token: null }).then((body) =>
      expectRefused('applyReferralCode', body, SIGNED_OUT),
    );
    cy.gqlRaw(APPLY, { code: UNKNOWN_CODE }, { token: memberToken }).then((body) =>
      expectRefused('applyReferralCode', body, refusal('BAD_USER_INPUT', 'That referral code does not exist')),
    );
    cy.gqlRaw(APPLY, { code: '   ' }, { token: memberToken }).then((body) =>
      expectRefused('applyReferralCode', body, refusal('BAD_USER_INPUT', 'Enter a referral code')),
    );
  });

  it('RF-05 after the refusals the member is still referred by nobody', () => {
    cy.gql<{ myReferral: MyReferral }>(MY_REFERRAL, {}, { token: memberToken }).then(({ myReferral }) => {
      expect(myReferral.referred_by_name).to.be.null;
    });
  });
});
