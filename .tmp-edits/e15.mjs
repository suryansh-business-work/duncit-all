import { readFileSync, writeFileSync } from 'node:fs';
const p = 'packages/utils/docs/index.mdx';
let s = readFileSync(p, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';
const L = (a) => a.join(eol);

const start = '## The @handle and where codes are allowed to land';
const end = '## Adding a helper';
const i = s.indexOf(start);
const j = s.indexOf(end);
if (i < 0 || j < 0) { console.error('section NOT FOUND'); process.exit(1); }

const section = L([
  '## The @handle, and where a member may be messaged',
  '',
  'Two things mWeb and the native app render identically (rule 27), so their LOGIC lives here',
  'and only the MUI card and the Tamagui card differ (rule 40).',
  '',
  '### The @handle is assigned, never typed',
  '',
  'A handle is minted ONCE by the server from the member\u2019s name (`generateUsername` in',
  '`server/src/modules/access/user/username.ts`, backfilled on `me` for accounts that predate',
  'handles). There is no field for it, no availability check and no save \u2014 a handle is the',
  'account\u2019s address, it is already baked into every share link in circulation, and a settings',
  'screen inviting somebody to change it invites them to break their own links.',
  '',
  'What is left on the client is therefore the LINK, not the handle:',
  '',
  '```ts',
  "profileUrl('https://mweb.duncit.com', 'ravi-9x3m'); // 'https://mweb.duncit.com/u/ravi-9x3m'",
  '',
  'const labels = buildUsernameLabels(t);',
  "labels.handle('ravi-9x3m'); // '@ravi-9x3m'",
  'labels.copyLink;            // the button beside it',
  '```',
  '',
  'Both surfaces render that pair on the PROFILE, under the name and next to Share \u2014 not in',
  'Profile Settings, which is where you change things.',
  '',
  '### Communication preferences',
  '',
  'One row in Profile Settings opens a hub listing Email / WhatsApp / SMS; each of those opens',
  'the screen that owns every switch for that channel, including its Authentication messages',
  'switch. Nothing is settable from two places, so `commChannelSummary` (the hub\u2019s one line per',
  'channel) only ever reads.',
  '',
  '```ts',
  'const labels = buildCommPreferenceLabels(t);',
  '',
  "commChannelSummary({ channel: 'EMAIL', reachable: true, destination: 'ravi@duncit.com', otp_enabled: true, otp_can_disable: true }, labels);",
  "// 'ravi@duncit.com · Authentication messages on'",
  "commChannelSummary({ channel: 'SMS', reachable: false, destination: '', otp_enabled: false, otp_can_disable: true }, labels);",
  "// 'Add a phone number to get messages here.' — \"off\" and \"no number\" are different answers",
  '```',
  '',
  '`commRowState` answers what ONE channel\u2019s switch may do, and `authMessageCardState` turns',
  'that into the whole card the channel screen renders \u2014 title, body, the status line under it,',
  'and whether a switch is offered at all:',
  '',
  '```ts',
  "commRowState({ channel: 'SMS', reachable: false, destination: '', otp_enabled: true, otp_can_disable: false });",
  '// { canToggle: false, locked: false, unreachable: true } — nothing to send to, so no switch',
  '',
  "commRowState({ channel: 'EMAIL', reachable: true, destination: 'ravi@duncit.com', otp_enabled: true, otp_can_disable: false });",
  '// { canToggle: false, locked: true, unreachable: false } — on, and the last channel that can reach them',
  '```',
  '',
  '`locked` is the case worth naming: a disabled switch with no sentence beside it reads as a',
  'bug, so `authMessageCardState` puts `labels.authLocked` in `note` whenever it is true. The',
  'server decides `otp_can_disable`, because it is the only side that can see all three channels',
  'at once \u2014 an account with nowhere to receive a code cannot sign in.',
  '',
  '`findCommChannel(channels, channel)` is the one lookup both apps use, so a screen that wants',
  'one channel out of the sheet never writes its own `.find`.',
  '',
  '',
]);
s = s.slice(0, i) + section + s.slice(j);
writeFileSync(p, s);
console.log('ok');
