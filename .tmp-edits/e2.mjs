import { readFileSync, writeFileSync } from 'node:fs';
const p = 'packages/i18n/src/bundles/mweb.ts';
let s = readFileSync(p, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';
const L = (a) => a.join(eol);
function swap(oldLines, newLines, tag) {
  const o = L(oldLines);
  if (!s.includes(o)) { console.error('NOT FOUND: ' + tag); process.exit(1); }
  s = s.replace(o, L(newLines));
}

// 1. commPreference — the hub copy, and "one-time codes" renamed everywhere.
swap([
  "    commPreference: {",
  "      title: 'Communication Preferences',",
  "      subtitle: 'Where we message you, and where your one-time codes arrive.',",
], [
  "    commPreference: {",
  "      title: 'Communication Preferences',",
  "      // The line under the single row in Profile Settings, and the line under",
  "      // the hub's own heading. Two places, two sentences: the row says what is",
  "      // behind it, the hub says what the reader is about to choose.",
  "      entryHint: 'Email, WhatsApp and SMS',",
  "      blurb: 'Pick a channel to choose what Duncit sends you there.',",
], 'commPreference head');

swap([
  "      otpLabel: 'One-time codes',",
  "      otpHint: 'Codes that prove it is you when you sign in.',",
  "      // The switch is disabled rather than allowed to strand somebody — the",
  "      // same shape as Connected Accounts' only-way-in guard.",
  "      otpLocked: 'This is the only channel that can reach you, so codes stay on here.',",
  "      emailMissing: 'Add an email address to get codes here.',",
  "      whatsappMissing: 'Add a WhatsApp number to get codes here.',",
  "      smsMissing: 'Add a phone number to get codes here.',",
], [
  "      // \"Authentication messages\", not \"one-time codes\": the reader is being",
  "      // asked where a security message may reach them, and half of them have",
  "      // never called the six digits inside it a code.",
  "      authTitle: 'Authentication messages',",
  "      authBody:",
  "        'The messages that prove it is you — signing in, and marking attendance at a pod.',",
  "      authSentTo: 'Sent to {destination}.',",
  "      // The switch is disabled rather than allowed to strand somebody — the",
  "      // same shape as Connected Accounts' only-way-in guard.",
  "      authLocked:",
  "        'This is the only channel that can reach you, so authentication messages stay on here.',",
  "      // The hub's one-line summary per channel.",
  "      authOn: 'Authentication messages on',",
  "      authOff: 'Authentication messages off',",
  "      emailMissing: 'Add an email address to get messages here.',",
  "      whatsappMissing: 'Add a WhatsApp number to get messages here.',",
  "      smsMissing: 'Add a phone number to get messages here.',",
], 'commPreference otp block');

// 2. smsPreference — the same rename, and the one-switch explanation reworded.
swap([
  "      noNumber: 'Add a phone number to your account to receive texts.',",
  "      otpHeading: 'One-time codes',",
  "      otpBody: 'Codes that prove it is you — signing in, and marking attendance at a pod.',",
  "      // Said plainly rather than implied by an empty list: a screen with one",
  "      // switch on it reads as broken unless it says why.",
  "      onlyUse:",
  "        'One-time codes are the only texts Duncit sends today. There are no marketing or reminder texts to switch off.',",
], [
  "      noNumber: 'Add a phone number to your account to receive texts.',",
  "      // Said plainly rather than implied by an empty list: a screen with one",
  "      // switch on it reads as broken unless it says why.",
  "      authOnly:",
  "        'Authentication messages are the only texts Duncit sends today. There are no marketing or reminder texts to switch off.',",
], 'smsPreference');

// 3. account.username — no field, no availability check, no save. What is left
//    is the LINK, and it lives on the profile rather than in settings.
swap([
  "      // Profile Settings > Username. The handle is what /u/<username> carries,",
  "      // so this section owns both the edit field and the link it produces.",
  "      username: {",
  "        title: 'Username',",
  "        subtitle: 'This is how people find and share your profile.',",
  "        label: 'Username',",
  "        placeholder: 'your-handle',",
  "        linkLabel: 'Your profile link',",
  "        checking: 'Checking availability…',",
  "        available: '{username} is available.',",
  "        current: 'This is your username.',",
  "        // The three refusals the server answers with. Keyed by its reason",
  "        // code, so the server ships codes and never English (rule 38).",
  "        taken: 'Someone already has that username.',",
  "        reserved: 'That username is reserved.',",
  "        format: 'Use 3–30 characters: lowercase letters, numbers and single hyphens.',",
  "        save: 'Save username',",
  "        saved: 'Username updated',",
  "        saveFailed: 'Could not save that username. Please try again.',",
  "        copyLink: 'Copy profile link',",
  "        linkCopied: 'Profile link copied',",
  "      },",
], [
  "      // The @handle is minted by the server and never typed, so the only copy",
  "      // left is on the button that copies the link it produces — and that",
  "      // button lives on the PROFILE, beside the handle, not in settings.",
  "      username: {",
  "        copyLink: 'Copy profile link',",
  "        linkCopied: 'Profile link copied',",
  "      },",
], 'account.username');

// 4. The hub is a route, so it needs a page title (SSR + the client mirror).
swap([
  "      mailPreference: { title: 'Mail preferences' },",
], [
  "      commPreference: { title: 'Communication preferences' },",
  "      mailPreference: { title: 'Mail preferences' },",
], 'meta');

writeFileSync(p, s);
console.log('ok');
