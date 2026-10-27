import type { RunAccount } from '../../support/run-account';
import {
  COMM_PREFERENCE_API,
  SET_OTP_CHANNEL_API,
  SET_WHATSAPP_PREFERENCE_API,
  WHATSAPP_PREFERENCE_API,
  apiToken,
  asAccount,
  openSignedIn,
  runPasswordNow,
} from '../../support/ui-shell';
import { staffAccount } from '../../support/ui-staff';

/**
 * Portal Shell › Profile preferences: the Notifications tab's sign-in-code
 * channels (`ShellSetMyOtpChannel`) and WhatsApp categories
 * (`ShellSetMyWhatsappPreference`) write through the same server rules mWeb
 * uses and are read back after a reload. The page must agree with what the
 * server says each row may do (utils comm-preference.ts commRowState: an
 * unreachable channel has no switch, the last enabled one is locked on).
 * Only the run account's own preferences change, and `after()` restores them.
 * (The mail switches and the private-profile switch are in profile.cy.ts.)
 */

interface Channel {
  channel: string;
  reachable: boolean;
  otp_enabled: boolean;
  otp_can_disable: boolean;
}

interface WhatsappSheet {
  reachable: boolean;
  categories: { category: string; required: boolean; enabled: boolean }[];
}

describe('Portal Shell · Profile preferences (Support, run account)', () => {
  let account: RunAccount;
  let channels: Channel[] = [];
  let whatsapp: WhatsappSheet | null = null;

  before(() => {
    account = staffAccount();
    apiToken('support', account).then((token) => {
      asAccount<{ myCommunicationPreference: { channels: Channel[] } }>('support', token, COMM_PREFERENCE_API).then((d) => {
        channels = d.myCommunicationPreference.channels;
      });
      asAccount<{ myWhatsappPreference: WhatsappSheet }>('support', token, WHATSAPP_PREFERENCE_API).then((d) => {
        whatsapp = d.myWhatsappPreference;
      });
    });
  });

  after(() => {
    if (!account) return;
    const rows = channels;
    const sheet = whatsapp;
    apiToken('support', account).then((token) => {
      // Re-enable before disabling, so the server never sees the last channel switched off.
      for (const row of [...rows].sort((a, b) => Number(b.otp_enabled) - Number(a.otp_enabled))) {
        if (row.reachable) asAccount('support', token, SET_OTP_CHANNEL_API, { channel: row.channel, enabled: row.otp_enabled });
      }
      for (const row of sheet?.reachable ? sheet.categories.filter((c) => !c.required) : []) {
        asAccount('support', token, SET_WHATSAPP_PREFERENCE_API, { category: row.category, enabled: row.enabled });
      }
    });
  });

  beforeEach(() => {
    cy.apiPortalLogin('support', account.email, runPasswordNow(account));
  });

  it('PP-01 each code channel shows the switch the server allows, and turning one on survives a reload', () => {
    if (channels.length === 0) throw new Error('myCommunicationPreference answered no channels for the run account.');
    openSignedIn('support', '/profile?selectedtab=notifications');
    for (const row of channels) {
      const box = () => cy.byTestId(`otp-channel-${row.channel}`).find('input[type="checkbox"]');
      if (!row.reachable) box().should('be.disabled').and('not.be.checked');
      else if (row.otp_enabled && !row.otp_can_disable) box().should('be.disabled').and('be.checked');
      else box().should('be.enabled').and(row.otp_enabled ? 'be.checked' : 'not.be.checked');
    }
    const off = channels.find((row) => row.reachable && !row.otp_enabled);
    if (!off) throw new Error('Every reachable code channel is already on; no channel can be switched on.');
    cy.interceptOperation('ShellSetMyOtpChannel');
    cy.byTestId(`otp-channel-${off.channel}`).find('input[type="checkbox"]').click();
    cy.wait('@ShellSetMyOtpChannel').then(({ request, response }) => {
      expect(request.body.variables).to.deep.equal({ channel: off.channel, enabled: true });
      expect(response?.body.errors).to.be.undefined;
    });
    cy.reload();
    cy.byTestId(`otp-channel-${off.channel}`).find('input[type="checkbox"]').should('be.checked');
  });

  it('PP-02 WhatsApp categories follow the number: without one the tab says so, with one a switch is saved', () => {
    const sheet = whatsapp;
    if (!sheet) throw new Error('myWhatsappPreference did not answer for the run account.');
    openSignedIn('support', '/profile?selectedtab=notifications');
    if (!sheet.reachable) {
      cy.byTestId('whatsapp-no-number').should('be.visible');
      return;
    }
    cy.byTestId('whatsapp-no-number').should('not.exist');
    const optional = sheet.categories.find((c) => !c.required);
    if (!optional) throw new Error('No switchable WhatsApp category is configured on staging.');
    for (const locked of sheet.categories.filter((c) => c.required)) {
      cy.byTestId(`whatsapp-preference-${locked.category}`).find('input[type="checkbox"]').should('be.disabled');
    }
    cy.interceptOperation('ShellSetMyWhatsappPreference');
    cy.byTestId(`whatsapp-preference-${optional.category}`).find('input[type="checkbox"]').click();
    cy.wait('@ShellSetMyWhatsappPreference')
      .its('request.body.variables')
      .should('deep.equal', { category: optional.category, enabled: !optional.enabled });
    cy.reload();
    cy.byTestId(`whatsapp-preference-${optional.category}`)
      .find('input[type="checkbox"]')
      .should(optional.enabled ? 'not.be.checked' : 'be.checked');
  });
});
