import { readFileSync, writeFileSync } from 'node:fs';
const p = 'packages/utils/src/index.ts';
let s = readFileSync(p, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';
const L = (a) => a.join(eol);
const oldComm = L([
  'export {',
  '  buildCommPreferenceLabels,',
  '  commRowState,',
  '  COMM_CHANNELS,',
]);
const newComm = L([
  'export {',
  '  authMessageCardState,',
  '  buildCommPreferenceLabels,',
  '  commChannelSummary,',
  '  commRowState,',
  '  findCommChannel,',
  '  COMM_CHANNELS,',
  '  type AuthMessageCardState,',
]);
if (!s.includes(oldComm)) { console.error('comm NOT FOUND, eol=' + JSON.stringify(eol)); process.exit(1); }
s = s.replace(oldComm, newComm);
const oldUser = L([
  'export {',
  '  buildUsernameLabels,',
  '  canSaveUsername,',
  '  isUsernameError,',
  '  normalizeUsername,',
  '  profileUrl,',
  '  usernameStatus,',
  '  USERNAME_PATTERN,',
  '  type UsernameLabels,',
  '  type UsernameRejection,',
  '  type UsernameStatus,',
  '  type UsernameStatusInput,',
  '  type UsernameTranslate,',
  "} from './username';",
]);
const newUser = L([
  'export {',
  '  buildUsernameLabels,',
  '  profileUrl,',
  '  type UsernameLabels,',
  '  type UsernameTranslate,',
  "} from './username';",
]);
if (!s.includes(oldUser)) { console.error('user NOT FOUND'); process.exit(1); }
s = s.replace(oldUser, newUser);
writeFileSync(p, s);
console.log('ok');
