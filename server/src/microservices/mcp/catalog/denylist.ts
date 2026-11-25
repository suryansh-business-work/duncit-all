import { wordsOf } from './naming';

/**
 * Fields no MCP tool is ever built for, in a module that is otherwise exposed.
 * (Whole modules — sign-in, OTP, captcha, secrets — are kept out in
 * categories.ts.) Each one is something a PERSON must do, or something whose
 * answer must never land in an AI provider's context window.
 */

/** Named one by one, each with its reason. */
const DENIED_FIELDS: ReadonlyMap<string, string> = new Map([
  ['giftCardOrderLabelFile', 'returns a shipping label PDF as base64 — a console download'],
  ['staffCallIceServers', 'returns TURN relay credentials'],
  ['downloadIosSigningFile', 'returns an iOS signing certificate'],
  ['requestDbBackupDownload', 'returns a link to a full database archive'],
  ['startE2eRun', 'hands the E2E workflow its test credentials; CI only'],
  // The unit-test reporter's writes: a CI run records what it ran, not a person.
  ['claimUnitTestRun', 'called by CI, not a person'],
  ['reportUnitTestWorkspaces', 'called by CI, not a person'],
  ['reportUnitTestFiles', 'called by CI, not a person'],
  ['reportUnitTestCases', 'called by CI, not a person'],
  ['finishUnitTestRun', 'called by CI, not a person'],
  ['attachStaffCallRecording', 'called by the call recorder, not a person'],
  // The Duncit CRM app reports calls its phone actually made, and keeps its
  // offline caller ID copy. An agent can neither have made a phone call nor
  // needs every lead's number in its context window — crmPhoneLookup answers
  // one number at a time.
  ['logCrmDeviceCall', 'reported by the Duncit CRM app for a call its phone made'],
  ['attachCrmDeviceCallRecording', 'uploaded by the Duncit CRM app from its phone'],
  ['crmPhoneDirectory', 'returns every lead phone number at once, for the offline caller ID of the app'],
  // The AI portal reports these as people use a prompt; an agent calling it
  // would only inflate that prompt's analytics.
  ['recordAiPromptEvent', 'reported by the AI portal as people use a prompt'],
  // The MCP console's own decisions. An AI must never approve its own
  // connection, revoke one, or loosen the settings that constrain it.
  ['mcpAuthorizationRequest', 'part of the consent screen'],
  ['approveMcpAuthorization', 'only the person may approve a connection'],
  ['denyMcpAuthorization', 'only the person may deny a connection'],
  ['revokeMcpConnection', 'only the person may revoke a connection'],
  ['updateMcpSettings', 'MCP safety settings are changed in the console'],
  // Retired and always refused: a typed reference must never again mark a
  // rental refund paid. Refunds go out through Razorpay (sendRentalRefund).
  ['markRentalRefunded', 'retired: rental refunds are sent through Razorpay, never marked paid by hand'],
  // A signed link to a buyer's private bank screenshot or statement.
  ['failedPaymentEvidenceLink', 'returns a signed link to private payment evidence'],
  // Security Verification. The screen's own operations belong to the person who
  // is signing in; the opened record carries a person's address and GPS
  // coordinates, which never land in an AI provider's context window; and
  // approving an alternative verification is a human reviewer's decision.
  ['portalSecurityChallenge', 'part of the sign-in screen'],
  ['portalSecurityException', 'part of the sign-in screen'],
  ['submitPortalSecurityVerification', 'only the person signing in completes the screen'],
  ['requestPortalSecurityException', 'only the person signing in asks for an alternative'],
  ['portalSecurityLog', "returns a person's IP address and GPS coordinates"],
  ['decidePortalSecurityException', 'approving an alternative verification is a human reviewer decision'],
]);

/** Any field whose name carries one of these words is refused. */
const DENIED_WORDS: ReadonlyMap<string, string> = new Map([
  ['password', 'passwords are set by the person'],
  ['otp', 'one-time codes are for the person to receive'],
  ['token', 'tokens are credentials'],
  ['tokens', 'tokens are credentials'],
  ['login', 'signing in is for the person'],
  ['logout', 'signing out is for the person'],
  ['signup', 'signing up is for the person'],
  ['seed', 'seeding is a deploy step'],
  ['impersonate', 'acting as someone else is not delegated'],
  ['secret', 'secrets never leave the server'],
  ['credential', 'credentials never leave the server'],
  ['credentials', 'credentials never leave the server'],
  ['base64', 'whole files do not belong in a chat context'],
  // A printed gift card's passcode IS its coins: reading one belongs to a person
  // in the Loyalty console, where every read is written to the card's history.
  ['passcode', 'a gift card passcode is the value of the card'],
  ['passcodes', 'a gift card passcode is the value of the card'],
]);

const DENIED_PAIRS: ReadonlyArray<readonly [string, string, string]> = [
  ['two', 'factor', 'two-factor setup is for the person'],
  ['sign', 'out', 'signing out is for the person'],
];

/** Why a field is never exposed, or null when it may be. */
export function deniedReason(fieldName: string): string | null {
  const named = DENIED_FIELDS.get(fieldName);
  if (named) return named;
  const words = wordsOf(fieldName);
  for (const word of words) {
    const reason = DENIED_WORDS.get(word);
    if (reason) return reason;
  }
  for (const [first, second, reason] of DENIED_PAIRS) {
    if (words.some((word, index) => word === first && words[index + 1] === second)) return reason;
  }
  return null;
}
