/// <reference types="cypress" />
import { firstError, type GqlAnswer } from '../../../support/api-other';
import { runAccount } from '../../../support/run-account';

/**
 * Public forms ask a signed-out visitor for the human check FIRST
 * (server/src/modules/platform/captcha/captcha.guard.ts `requireHuman`, the
 * first statement of submitContactForm and submitStatusReport). Verdicts come
 * from captcha.service.ts: a token is signed, lives 10 minutes and is burned
 * on its first attempt, right or wrong. The job application form is NOT
 * captcha-gated — it is validated instead (jobApplication.validator.ts).
 * Scenario map: Other › Public forms / captcha.
 *
 * No submission here can be accepted: every one is refused before the service
 * runs. The addresses belong to the run, so even a broken gate would only ever
 * write to the run's own mailbox.
 */

const CONTACT = `mutation E2eContact($input: SubmitContactInput!) { submitContactForm(input: $input) { ok } }`;
const STATUS_REPORT = `mutation E2eStatusReport($input: SubmitStatusReportInput!) { submitStatusReport(input: $input) { __typename } }`;
const CHALLENGE = `query E2eCaptcha { captchaChallenge { token image expires_in } }`;
const JOB = `mutation E2eJob($input: SubmitJobApplicationInput!) { submitJobApplication(input: $input) { ok } }`;

interface Challenge {
  token: string;
  image: string;
  expires_in: number;
}

const expectVerdict = (field: string, body: GqlAnswer, code: string, message: string) => {
  const error = firstError(body, field);
  expect(error.code, `${field} verdict code`).to.equal(code);
  expect(error.message, `${field} verdict message`).to.equal(message);
  expect(body.data?.[field] ?? null, `${field} stored nothing`).to.be.null;
};

describe('API · Public forms refuse a missing, forged, wrong or reused captcha', { testIsolation: false }, () => {
  const account = runAccount();
  const contact = (captcha: Record<string, string> = {}) => ({
    input: { name: 'E2E Visitor', email: account.address('contact'), message: 'e2e captcha probe', ...captcha },
  });
  const report = (captcha: Record<string, string>) => ({
    input: { name: 'E2E Visitor', email: account.address('status'), message: 'e2e captcha probe', ...captcha },
  });

  it('PC-01 a challenge is issued to anyone, signed and good for 10 minutes', () => {
    cy.gql<{ captchaChallenge: Challenge }>(CHALLENGE, {}, { token: null }).then(({ captchaChallenge }) => {
      expect(captchaChallenge.token.split('.'), 'version.body.signature').to.have.length(3);
      expect(captchaChallenge.token.startsWith('c1.')).to.equal(true);
      expect(captchaChallenge.image).to.be.a('string').and.not.be.empty;
      expect(captchaChallenge.expires_in).to.equal(600);
    });
  });

  it('PC-02 a contact form with no captcha is refused with CAPTCHA_REQUIRED', () => {
    cy.gqlRaw(CONTACT, contact(), { token: null }).then((body) =>
      expectVerdict('submitContactForm', body, 'CAPTCHA_REQUIRED', 'Please complete the verification below.'),
    );
  });

  it('PC-03 a forged captcha token is refused with CAPTCHA_INVALID', () => {
    const forged = { captcha_token: 'c1.e2e.forged', captcha_answer: 'ABCDE' };
    cy.gqlRaw(CONTACT, contact(forged), { token: null }).then((body) =>
      expectVerdict(
        'submitContactForm',
        body,
        'CAPTCHA_INVALID',
        'The verification code could not be checked. Please try a new one.',
      ),
    );
  });

  it('PC-04 a real token with the wrong answer is refused, and the same token is then spent', () => {
    cy.gql<{ captchaChallenge: Challenge }>(CHALLENGE, {}, { token: null }).then(({ captchaChallenge }) => {
      // Five characters, like a real answer, but '0' is not in CAPTCHA_ALPHABET (captcha.image.ts), so it can never match.
      const wrong = { captcha_token: captchaChallenge.token, captcha_answer: '00000' };
      cy.gqlRaw(STATUS_REPORT, report(wrong), { token: null }).then((body) =>
        expectVerdict(
          'submitStatusReport',
          body,
          'CAPTCHA_WRONG',
          'The verification code does not match. Please try again.',
        ),
      );
      cy.gqlRaw(STATUS_REPORT, report(wrong), { token: null }).then((body) =>
        expectVerdict(
          'submitStatusReport',
          body,
          'CAPTCHA_EXPIRED',
          'The verification code expired. Please try a new one.',
        ),
      );
    });
  });

  it('PC-05 the job application form is validated rather than captcha-gated', () => {
    const input = { role_title: 'E2E role', name: 'E2E Visitor', email: 'not-an-email' };
    cy.gqlRaw(JOB, { input }, { token: null }).then((body) => {
      const error = firstError(body, 'submitJobApplication');
      expect(error.code).to.equal('BAD_USER_INPUT');
      expect(error.message).to.equal('Validation failed');
      expect(error.errors).to.deep.equal(['Enter a valid email']);
      expect(body.data?.submitJobApplication ?? null).to.be.null;
    });
  });
});
