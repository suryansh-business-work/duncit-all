import { readFileSync, writeFileSync } from 'node:fs';
const p = 'server/src/modules/ai/askBot/askBot.catalog.apps.ts';
let s = readFileSync(p, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';
const L = (a) => a.join(eol);
function swap(o, n, tag) {
  const oo = L(o);
  if (!s.includes(oo)) { console.error('NOT FOUND: ' + tag); process.exit(1); }
  s = s.replace(oo, L(n));
}

swap([
  "  { surface: 'mweb', path: '/account/mail-preference', label: 'Mail Preference', group: 'Manage Account',",
  "    description: 'Choose which categories of Duncit email you want to keep receiving and switch any of them off.' },",
  "  { surface: 'mweb', path: '/account/sms-preference', label: 'SMS Preference', group: 'Manage Account',",
  "    description: 'Decide whether one-time codes may reach you by text. One-time codes are the only texts Duncit sends, and the switch is refused when SMS is the last channel that can reach you.' },",
], [
  "  { surface: 'mweb', path: '/account/communication', label: 'Communication Preferences', group: 'Manage Account',",
  "    description: 'The hub reached from one row in Profile Settings: it lists Email, WhatsApp and SMS with where each one goes and whether authentication messages arrive there, and opens each channel screen.' },",
  "  { surface: 'mweb', path: '/account/mail-preference', label: 'Mail Preference', group: 'Manage Account',",
  "    description: 'Choose which categories of Duncit email you want to keep receiving, switch any of them off, and decide whether authentication messages may reach you by email.' },",
  "  { surface: 'mweb', path: '/account/sms-preference', label: 'SMS Preference', group: 'Manage Account',",
  "    description: 'Decide whether authentication messages may reach you by text. They are the only texts Duncit sends, and the switch is refused when SMS is the last channel that can reach you.' },",
], 'mweb rows');

swap([
  "  { surface: 'app', path: '/account/mail-preference', label: 'Mail Preference', group: 'Account',",
  "    description: 'On the Mail Preference screen (reached in-app from Profile Settings — no deep link registered) a member switches individual email categories on or off, sees which emails always arrive, and unsubscribes from or resubscribes to everything at once.' },",
  "  { surface: 'app', path: '/account/sms-preference', label: 'SMS Preference', group: 'Account',",
  "    description: 'On the SMS Preference screen (reached from Profile Settings > Communication Preferences) a member decides whether one-time codes may reach them by text. One-time codes are the only texts Duncit sends today.' },",
], [
  "  { surface: 'app', path: '/account/communication', label: 'Communication Preferences', group: 'Account',",
  "    description: 'On the Communication Preferences screen (reached from one row in Profile Settings) a member sees Email, WhatsApp and SMS with where each one goes and whether authentication messages arrive there, and opens each channel screen from it.' },",
  "  { surface: 'app', path: '/account/mail-preference', label: 'Mail Preference', group: 'Account',",
  "    description: 'On the Mail Preference screen (reached from Profile Settings > Communication Preferences) a member switches individual email categories on or off, decides whether authentication messages may arrive by email, sees which emails always arrive, and unsubscribes from or resubscribes to everything at once.' },",
  "  { surface: 'app', path: '/account/sms-preference', label: 'SMS Preference', group: 'Account',",
  "    description: 'On the SMS Preference screen (reached from Profile Settings > Communication Preferences) a member decides whether authentication messages may reach them by text. They are the only texts Duncit sends today.' },",
], 'app rows');

// Profile Settings no longer holds a username field or the mail switches.
s = s.replace(
  "description: 'Edit your name, email, phone, WhatsApp, city and date of birth, watch your profile-completion meter and account-health score, set privacy, change your password, manage connected accounts, pick your language and adjust mail preferences.' },",
  "description: 'Edit your name, email, phone, WhatsApp, city and date of birth, watch your profile-completion meter and account-health score, set privacy, change your password, manage connected accounts, pick your language and open Communication Preferences. Your @handle is assigned automatically and is shown, with the link that copies it, on your profile.' },"
);
s = s.replace(
  "description: 'On the Profile Settings screen a member edits their account details, changes photo, sees completion and account-health meters, sets profile privacy, manages connected accounts, language and security, opens Mail Preference, and logs out.' },",
  "description: 'On the Profile Settings screen a member edits their account details, changes photo, sees completion and account-health meters, sets profile privacy, manages connected accounts, language and security, opens Communication Preferences, and logs out. Their @handle is assigned automatically and is shown, with the link that copies it, on their profile.' },"
);
writeFileSync(p, s);
console.log('ok');
