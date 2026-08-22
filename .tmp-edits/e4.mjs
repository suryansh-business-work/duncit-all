import { readFileSync, writeFileSync } from 'node:fs';
function edit(p, pairs) {
  let s = readFileSync(p, 'utf8');
  const eol = s.includes('\r\n') ? '\r\n' : '\n';
  for (const [oldLines, newLines, tag] of pairs) {
    const o = oldLines.join(eol);
    if (!s.includes(o)) { console.error(`NOT FOUND in ${p}: ${tag}`); process.exit(1); }
    s = s.replace(o, newLines.join(eol));
  }
  writeFileSync(p, s);
  console.log('ok ' + p);
}

// ---- Mail: the channel's own screen now owns its auth switch -------------
edit('app/mweb/src/pages/mail-preference-page/MailPreferencePage.tsx', [
  [
    ["import ConfirmDialog from '../../components/ConfirmDialog';"],
    [
      "import ConfirmDialog from '../../components/ConfirmDialog';",
      "import { AuthMessagesCard } from '../account-page/comm-preference';",
    ],
    'import',
  ],
  [
    [
      "      {state.saveFailed && <Alert severity=\"error\">{t('mailPreference.saveFailed')}</Alert>}",
      '',
      '      <MailPreferenceSection',
    ],
    [
      "      {state.saveFailed && <Alert severity=\"error\">{t('mailPreference.saveFailed')}</Alert>}",
      '',
      '      {/* Signed-in only: `/unsubscribe` is read by somebody in their inbox',
      '          who has no session, and the sheet this card writes needs one. */}',
      '      {!fromLink && <AuthMessagesCard channel="EMAIL" />}',
      '',
      '      <MailPreferenceSection',
    ],
    'card',
  ],
]);

// ---- WhatsApp ------------------------------------------------------------
edit('app/mweb/src/pages/whatsapp-preference-page/WhatsAppPreferencePage.tsx', [
  [
    ["import ConfirmDialog from '../../components/ConfirmDialog';"],
    [
      "import ConfirmDialog from '../../components/ConfirmDialog';",
      "import { AuthMessagesCard } from '../account-page/comm-preference';",
    ],
    'import',
  ],
  [
    [
      "      {state.saveFailed && <Alert severity=\"error\">{t('whatsappPreference.saveFailed')}</Alert>}",
      '',
      '      <WhatsAppPreferenceSection',
    ],
    [
      "      {state.saveFailed && <Alert severity=\"error\">{t('whatsappPreference.saveFailed')}</Alert>}",
      '',
      '      <AuthMessagesCard channel="WHATSAPP" />',
      '',
      '      <WhatsAppPreferenceSection',
    ],
    'card',
  ],
]);
