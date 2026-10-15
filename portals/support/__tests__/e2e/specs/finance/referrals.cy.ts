import type { RunAccount } from '../../support/run-account';
import { tableRow } from '../../support/tables';
import { consoleAccount, expectApiRefused, releaseConsoleRole, signIn, visitAndRead } from '../../support/ui-finance-crm';
import { countOperation, expectNotSent } from '../../support/ui-staff';

/**
 * Finance › Referrals (/referrals), as the analyst seat (FINANCE_USER).
 *
 * The log lists who brought whom (referrer, referred, code). The share-message
 * preview renders the LIVE draft with a stand-in code (`SAMPLE_CODE`
 * DUN-9F3A2C in ReferralsPage.tsx) and the coin count Duncit Coin > Settings
 * pays — the spec types a draft and reads the preview, never saving. Saving is
 * ADMIN_WRITE in referral.resolver.ts: refused to the analyst.
 */

const TABLE = 'finance-referrals';
const SAMPLE_CODE = 'DUN-9F3A2C';

interface ReferralRow {
  id: string;
  code: string;
  referrer_name: string | null;
  referred_name: string | null;
}

const UPDATE_REFERRAL_SETTINGS = `mutation E2eUpdateReferralSettings($input: ReferralSettingsInput!) {
  updateReferralSettings(input: $input) { share_message }
}`;

describe('Finance · Referrals (run account, password CHANGED)', () => {
  let account: RunAccount;

  before(() => {
    account = consoleAccount('finance');
  });

  beforeEach(() => {
    signIn('finance', account);
  });

  after(() => {
    releaseConsoleRole(account, 'finance');
  });

  it('FRF-01 the referral log shows each referral with its referrer, referred member and code', () => {
    visitAndRead<{ referralsTable: { rows: ReferralRow[] } }>('finance', '/referrals', 'FinanceReferralsTable').then(
      ({ referralsTable }) => {
        const [first] = referralsTable.rows;
        if (!first) {
          cy.byTestId('duncit-table-empty').should('be.visible');
          return;
        }
        tableRow(TABLE, first.id, [first.code, first.referrer_name ?? '', first.referred_name ?? '']);
      },
    );
  });

  it('FRF-02 the preview fills the draft message\'s {code} and {coins} as it is typed, and nothing is saved', () => {
    const updates = countOperation('UpdateReferralSettings');
    visitAndRead<{ referralSettings: { coins_per_referral: number } }>('finance', '/referrals', 'FinanceReferralSettings').then(
      ({ referralSettings }) => {
        cy.byTestId('referral-share-message').find('textarea').first().clear().type('Use {code} to earn {coins} coins', {
          parseSpecialCharSequences: false,
          delay: 0,
        });
        cy.byTestId('referral-preview').should(
          'have.text',
          `Use ${SAMPLE_CODE} to earn ${referralSettings.coins_per_referral} coins`,
        );
      },
    );
    expectNotSent(updates, 'UpdateReferralSettings');
  });

  it('FRF-03 saving the referral message is refused to the analyst', () => {
    expectApiRefused('finance', account, UPDATE_REFERRAL_SETTINGS, { input: {} }, 'updateReferralSettings');
  });
});
