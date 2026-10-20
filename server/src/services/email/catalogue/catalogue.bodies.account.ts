import {
  CALM,
  INFO,
  LIVE,
  PAUSED,
  STOPPED,
  callout,
  closing,
  codeBlock,
  cta,
  detailRows,
  intro,
  notice,
  paragraph,
  quote,
  shell,
  text,
  type Tone,
} from './mjml';
import { FIELD } from './catalogue.copy';

/**
 * The bodies of the account, access and inbound emails.
 *
 * These were `.mjml` files on disk until the move into the catalogue (rule 28):
 * the files' words are now keys in `catalogue.bundle.core.ts`, and every
 * variable each file referenced is still referenced here — a send site that
 * passes `{{name}}` finds it exactly where it did. Keyed by slug; the
 * catalogue's metadata rows in `catalogue.existing.ts` pick them up.
 */

/** The six one-time-code emails: heading, the code in its frame, the warning. */
function otpBody(ns: string, opts: { expiryKey?: string; tone?: Tone } = {}): string {
  return shell(
    `${ns}.title`,
    [
      intro(`${ns}.title`, `${ns}.body`, 'name'),
      codeBlock('otp', `{{t:${opts.expiryKey ?? 'email.otp.expires'}}}`, opts.tone),
      closing(`${ns}.ignore`),
    ].join('\n'),
    `${ns}.body`
  );
}

export const ACCOUNT_BODIES: Record<string, string> = {
  welcome: shell(
    'email.welcome.title',
    [
      intro('email.welcome.title', 'email.welcome.body', 'name'),
      cta('email.welcome.cta', 'app_url'),
      closing('email.welcome.notYou'),
    ].join('\n'),
    'email.welcome.body'
  ),

  'unsubscribe-confirmed': shell(
    'email.unsubscribe.title',
    [
      intro('email.unsubscribe.heading', 'email.unsubscribe.intro'),
      callout(CALM, FIELD.email, 'email'),
      text('email.unsubscribe.stillSending'),
      cta('email.unsubscribe.manage', 'unsubscribe_url'),
      closing('email.unsubscribe.mistake'),
    ].join('\n'),
    'email.unsubscribe.intro'
  ),

  'email-verification-otp': otpBody('email.verifyEmailOtp'),
  'password-reset-otp': otpBody('email.passwordResetOtp'),
  'password-change-otp': otpBody('email.passwordChangeOtp', { tone: PAUSED }),
  'account-deletion-otp': otpBody('email.accountDeletionOtp', { tone: STOPPED }),
  'login-otp': otpBody('email.loginOtp', { expiryKey: 'email.loginOtp.expires' }),
  'portal-login-otp': otpBody('email.portalLoginOtp', { expiryKey: 'email.portalLoginOtp.expires' }),
  'env-access-otp': otpBody('email.envAccessOtp', { expiryKey: 'email.envAccessOtp.expires', tone: PAUSED }),

  'admin-credentials': shell(
    'email.adminCredentials.title',
    [
      intro('email.adminCredentials.title', 'email.adminCredentials.body', 'name'),
      detailRows([
        { labelKey: 'email.adminCredentials.emailLabel', valueVar: 'email' },
        { labelKey: 'email.adminCredentials.passwordLabel', valueVar: 'password' },
      ]),
      cta('email.adminCredentials.cta', 'admin_url'),
      notice(STOPPED, 'email.adminCredentials.changeNowTitle', '{{t:email.adminCredentials.changeNow}}'),
    ].join('\n'),
    'email.adminCredentials.body'
  ),

  'admin-access-granted': shell(
    'email.adminAccessGranted.title',
    [
      intro('email.adminAccessGranted.title', 'email.adminAccessGranted.body', 'name'),
      cta('email.adminAccessGranted.cta', 'admin_url'),
      notice(PAUSED, 'email.adminAccessGranted.safetyTitle', '{{t:email.adminAccessGranted.safetyBody}}'),
    ].join('\n'),
    'email.adminAccessGranted.body'
  ),

  'admin-access-revoked': shell(
    'email.adminAccessRevoked.title',
    [
      intro('email.adminAccessRevoked.title', 'email.adminAccessRevoked.body', 'name'),
      closing('email.adminAccessRevoked.unchanged'),
    ].join('\n'),
    'email.adminAccessRevoked.body'
  ),

  'partner-access-granted': shell(
    'email.partnerAccess.title',
    [
      intro('email.partnerAccess.title', 'email.partnerAccess.body', 'name'),
      callout(LIVE, 'email.partnerAccess.accessLabel', 'partner_type'),
      cta('email.partnerAccess.cta', 'portal_url'),
      notice(INFO, 'email.partnerAccess.loginTitle', '{{t:email.partnerAccess.loginBody}}'),
    ].join('\n'),
    'email.partnerAccess.body'
  ),

  'newsletter-welcome': shell(
    'email.newsletterWelcome.title',
    [
      intro('email.newsletterWelcome.title', 'email.newsletterWelcome.body'),
      cta('email.newsletterWelcome.cta', 'site_url'),
      closing('email.newsletterWelcome.unsubscribe'),
    ].join('\n'),
    'email.newsletterWelcome.body'
  ),

  'contact-received': shell(
    'email.contactReceived.title',
    [
      intro('email.contactReceived.title', 'email.contactReceived.body', 'name'),
      detailRows([{ labelKey: FIELD.subject, valueVar: 'subject' }]),
      quote('email.contactReceived.messageLabel', 'message'),
      closing('email.contactReceived.followUp'),
    ].join('\n'),
    'email.contactReceived.body'
  ),

  'faq-received': shell(
    'email.faqReceived.title',
    [
      intro('email.faqReceived.title', 'email.faqReceived.body'),
      quote('email.faqReceived.questionLabel', 'question'),
      closing('email.faqReceived.faster'),
    ].join('\n'),
    'email.faqReceived.body'
  ),

  'grievance-received': shell(
    'email.grievance.title',
    [
      intro('email.grievance.heading', 'email.grievance.intro', 'name'),
      callout(CALM, 'email.grievance.refLabel', 'grievance_no'),
      text('email.grievance.refHint'),
      detailRows([{ labelKey: 'email.grievance.subjectLabel', valueVar: 'subject' }]),
      quote('email.grievance.detailsLabel', 'description'),
      quote('email.grievance.officerLabel', 'officer_block'),
      closing('email.grievance.footer'),
    ].join('\n'),
    'email.grievance.intro'
  ),

  'signed-contract': shell(
    'email.signedContract.title',
    [
      intro('email.signedContract.title', 'email.signedContract.body'),
      callout(CALM, 'email.signedContract.contractLabel', 'contract_name'),
      paragraph('{{message}}'),
      closing('email.signedContract.records'),
    ].join('\n'),
    'email.signedContract.body'
  ),
};
