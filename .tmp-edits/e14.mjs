import { readFileSync, writeFileSync } from 'node:fs';
const p = 'packages/docs-demos/src/demos/utils.tsx';
let s = readFileSync(p, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';
const L = (a) => a.join(eol);

const impOld = L([
  'import {',
  '  HOST_FREE_SPOT_NOTE,',
  '  formatMoney,',
]);
const impNew = L([
  'import {',
  '  HOST_FREE_SPOT_NOTE,',
  '  authMessageCardState,',
  '  buildCommPreferenceLabels,',
  '  commChannelSummary,',
  '  commRowState,',
  '  formatMoney,',
]);
if (!s.includes(impOld)) { console.error('import NOT FOUND'); process.exit(1); }
s = s.replace(impOld, impNew);

const impOld2 = "  type PodParticipationFields,\n} from '@duncit/utils';".replaceAll('\n', eol);
const impNew2 = L([
  '  type CommChannelState,',
  '  type PodParticipationFields,',
  "} from '@duncit/utils';",
]);
if (!s.includes(impOld2)) { console.error('import2 NOT FOUND'); process.exit(1); }
s = s.replace(impOld2, impNew2);

const tail = L([
  '  defineDemo<{ amounts: number[] }>({',
  "    id: 'money',",
]);
if (!s.includes(tail)) { console.error('tail NOT FOUND'); process.exit(1); }

const demo = L([
  '  defineDemo<{ channels: CommChannelState[] }>({',
  "    id: 'comm-preference',",
  "    title: 'Where a member is allowed to be messaged',",
  '    note:',
  "      'Switch otp_enabled off on EMAIL: WhatsApp is then the last channel that can reach them, so the server clears its otp_can_disable and its switch locks. Set reachable false and the switch disappears entirely — \"off\" and \"there is no number\" are different answers.',",
  '    mock: {',
  '      channels: [',
  '        {',
  "          channel: 'EMAIL',",
  '          reachable: true,',
  "          destination: 'ravi@duncit.com',",
  '          otp_enabled: true,',
  '          otp_can_disable: true,',
  '        },',
  '        {',
  "          channel: 'WHATSAPP',",
  '          reachable: true,',
  "          destination: '+91 87912 34693',",
  '          otp_enabled: true,',
  '          otp_can_disable: false,',
  '        },',
  '        {',
  "          channel: 'SMS',",
  '          reachable: false,',
  "          destination: '',",
  '          otp_enabled: false,',
  '          otp_can_disable: true,',
  '        },',
  '      ],',
  '    },',
  '    compute: (mock) => {',
  '      // The shipped fallback copy, so the demo reads exactly as the screen',
  '      // does rather than echoing key names back.',
  '      const copy: Record<string, string> = {',
  "        'mweb.commPreference.title': 'Communication Preferences',",
  "        'mweb.commPreference.blurb': 'Pick a channel to choose what Duncit sends you there.',",
  "        'mweb.commPreference.entryHint': 'Email, WhatsApp and SMS',",
  "        'mweb.commPreference.authTitle': 'Authentication messages',",
  "        'mweb.commPreference.authBody':",
  "          'The messages that prove it is you — signing in, and marking attendance at a pod.',",
  "        'mweb.commPreference.authSentTo': 'Sent to {destination}.',",
  "        'mweb.commPreference.authLocked':",
  "          'This is the only channel that can reach you, so authentication messages stay on here.',",
  "        'mweb.commPreference.authOn': 'Authentication messages on',",
  "        'mweb.commPreference.authOff': 'Authentication messages off',",
  "        'mweb.commPreference.email': 'Email',",
  "        'mweb.commPreference.whatsapp': 'WhatsApp',",
  "        'mweb.commPreference.sms': 'SMS',",
  "        'mweb.commPreference.emailHint': 'Choose which emails we send you',",
  "        'mweb.commPreference.whatsappHint': 'Choose which WhatsApp messages we send you',",
  "        'mweb.commPreference.smsHint': 'Choose which text messages we send you',",
  "        'mweb.commPreference.emailMissing': 'Add an email address to get messages here.',",
  "        'mweb.commPreference.whatsappMissing': 'Add a WhatsApp number to get messages here.',",
  "        'mweb.commPreference.smsMissing': 'Add a phone number to get messages here.',",
  "        'mweb.commPreference.saved': 'Preferences updated',",
  "        'mweb.commPreference.saveFailed': 'Could not change that. Please try again.',",
  "        'mweb.commPreference.loadFailed': 'Could not load your communication preferences.',",
  '      };',
  '      const t = (key: string, options?: { vars?: Record<string, string | number> }) => {',
  '        const line = copy[key] ?? key;',
  '        const destination = options?.vars?.destination;',
  "        return destination === undefined ? line : line.replace('{destination}', String(destination));",
  '      };',
  '      const labels = buildCommPreferenceLabels(t);',
  '      return Object.fromEntries(',
  '        mock.channels.map((row) => [',
  '          row.channel,',
  '          [',
  '            `hub: ${commChannelSummary(row, labels)}`,',
  '            `card note: ${authMessageCardState(row, labels).note}`,',
  '            `switch: ${JSON.stringify(commRowState(row))}`,',
  "          ].join('   ·   '),",
  '        ])',
  '      );',
  '    },',
  '  }),',
  '',
]);
s = s.replace(tail, demo + tail);
writeFileSync(p, s);
console.log('ok');
