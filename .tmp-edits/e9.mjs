import { readFileSync, writeFileSync } from 'node:fs';
function edit(p, pairs) {
  let s = readFileSync(p, 'utf8');
  const eol = s.includes('\r\n') ? '\r\n' : '\n';
  for (const [o, n, tag] of pairs) {
    const oo = o.join(eol);
    if (!s.includes(oo)) { console.error(`NOT FOUND in ${p}: ${tag}`); process.exit(1); }
    s = s.replace(oo, n.join(eol));
  }
  writeFileSync(p, s);
  console.log('ok ' + p);
}

edit('app/mobile-app/src/screens/MailPreferenceScreen.tsx', [
  [
    ["import { ConfirmDialog } from '@/components/ConfirmDialog';"],
    [
      "import { AuthMessagesCard } from '@/components/comm-preference';",
      "import { ConfirmDialog } from '@/components/ConfirmDialog';",
    ],
    'import',
  ],
  [
    [
      '      <MailPreferenceSection',
      "        heading={t('mailPreference.optionalHeading')}",
    ],
    [
      '      <AuthMessagesCard channel="EMAIL" />',
      '',
      '      <MailPreferenceSection',
      "        heading={t('mailPreference.optionalHeading')}",
    ],
    'card',
  ],
]);

edit('app/mobile-app/src/screens/WhatsAppPreferenceScreen.tsx', [
  [
    ["import { ConfirmDialog } from '@/components/ConfirmDialog';"],
    [
      "import { AuthMessagesCard } from '@/components/comm-preference';",
      "import { ConfirmDialog } from '@/components/ConfirmDialog';",
    ],
    'import',
  ],
  [
    [
      '      <WhatsAppPreferenceSection',
      "        heading={t('whatsappPreference.optionalHeading')}",
    ],
    [
      '      <AuthMessagesCard channel="WHATSAPP" />',
      '',
      '      <WhatsAppPreferenceSection',
      "        heading={t('whatsappPreference.optionalHeading')}",
    ],
    'card',
  ],
]);
