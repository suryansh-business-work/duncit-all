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

// ---- nav types -----------------------------------------------------------
edit('app/mobile-app/src/navigation/types.ts', [
  [
    [
      "  /** Profile → Mail Preference, the twin of mWeb's /account/mail-preference. */",
      '  MailPreference: undefined;',
    ],
    [
      '  /** Profile Settings → Communication Preferences: the hub that lists the',
      "   * three channels. Twin of mWeb's /account/communication. */",
      '  CommPreference: undefined;',
      "  /** Communication Preferences → Mail, the twin of mWeb's /account/mail-preference. */",
      '  MailPreference: undefined;',
    ],
    'types',
  ],
]);

// ---- root navigator ------------------------------------------------------
edit('app/mobile-app/src/navigation/RootNavigator.tsx', [
  [
    ["import { MailPreferenceScreen } from '@/screens/MailPreferenceScreen';"],
    [
      "import { CommPreferenceScreen } from '@/screens/CommPreferenceScreen';",
      "import { MailPreferenceScreen } from '@/screens/MailPreferenceScreen';",
    ],
    'import',
  ],
  [
    ['      <Stack.Screen name="MailPreference" component={MailPreferenceScreen} />'],
    [
      '      <Stack.Screen name="CommPreference" component={CommPreferenceScreen} />',
      '      <Stack.Screen name="MailPreference" component={MailPreferenceScreen} />',
    ],
    'screen',
  ],
]);

// ---- AccountScreen: one row, and no username section ---------------------
edit('app/mobile-app/src/screens/AccountScreen.tsx', [
  [
    [
      '  SecuritySection,',
      '  UsernameSection,',
      "} from '@/components/account';",
      "import { CommunicationPreferencesSection } from '@/components/comm-preference';",
    ],
    [
      '  SecuritySection,',
      "} from '@/components/account';",
      "import { CommPreferenceEntryCard } from '@/components/comm-preference';",
    ],
    'imports',
  ],
  [
    [
      "  const openChannel = (channel: 'EMAIL' | 'WHATSAPP' | 'SMS') => {",
      "    if (channel === 'EMAIL') navigation.navigate('MailPreference');",
      "    else if (channel === 'WHATSAPP') navigation.navigate('WhatsAppPreference');",
      "    else navigation.navigate('SmsPreference');",
      '  };',
      '',
    ],
    [],
    'openChannel',
  ],
  [
    [
      '        <YStack height={1} backgroundColor="$borderColor" />',
      '        <UsernameSection current={me.username ?? null} onSaved={() => refresh()} />',
      '        <LanguageSection />',
      '        {/* Email, WhatsApp and SMS under one heading — each a door to its',
      '            own categories, each with its one-time-code switch inline. */}',
      '        <CommunicationPreferencesSection onOpenChannel={openChannel} />',
    ],
    [
      '        <YStack height={1} backgroundColor="$borderColor" />',
      '        <LanguageSection />',
      '        {/* One row, not three cards: the channels and every switch on them',
      '            live behind it. The @handle is minted by the server and is shown —',
      '            with the link it produces — on the profile itself, which is where',
      '            somebody goes to share it. */}',
      "        <CommPreferenceEntryCard onPress={() => navigation.navigate('CommPreference')} />",
    ],
    'section swap',
  ],
]);

// ---- account barrel ------------------------------------------------------
edit('app/mobile-app/src/components/account/index.tsx', [
  [
    ["export { UsernameSection } from './UsernameSection';", ''],
    [''],
    'barrel',
  ],
]);
