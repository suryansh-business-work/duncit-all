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

// ---- AppRoutes: the hub gets a route -------------------------------------
edit('app/mweb/src/app/AppRoutes.tsx', [
  [
    ["const MailPreferencePage = lazy(() => import('../pages/mail-preference-page'));"],
    [
      "const CommPreferencePage = lazy(() => import('../pages/comm-preference-page'));",
      "const MailPreferencePage = lazy(() => import('../pages/mail-preference-page'));",
    ],
    'lazy import',
  ],
  [
    ['        <Route path="/account/mail-preference" element={withAuth(<MailPreferencePage />)} />'],
    [
      '        {/* The one door to the three channels — Profile Settings links here,',
      '            and each channel screen is a door off this one. */}',
      '        <Route path="/account/communication" element={withAuth(<CommPreferencePage />)} />',
      '        <Route path="/account/mail-preference" element={withAuth(<MailPreferencePage />)} />',
    ],
    'route',
  ],
]);

// ---- meta-routes: the hub needs a page title -----------------------------
edit('app/mweb/server/meta-routes.ts', [
  [
    ["  { pattern: '/account/mail-preference', titleKey: 'mweb.meta.mailPreference.title' },"],
    [
      "  { pattern: '/account/communication', titleKey: 'mweb.meta.commPreference.title' },",
      "  { pattern: '/account/mail-preference', titleKey: 'mweb.meta.mailPreference.title' },",
    ],
    'meta route',
  ],
]);

// ---- AccountPage: one row, and no username section -----------------------
edit('app/mweb/src/pages/AccountPage.tsx', [
  [
    [
      "import CommunicationPreferencesSection from './account-page/comm-preference';",
      "import UsernameForm from './account-page/username-form';",
    ],
    ["import CommPreferenceEntryCard from './account-page/comm-preference';"],
    'imports',
  ],
  [
    [
      '      <UsernameForm current={me.username ?? null} onSaved={() => refetch()} />',
      '      <LanguageSection />',
      '      {/* Email, WhatsApp and SMS under one heading — each a door to its own',
      '          categories, each with its one-time-code switch inline. */}',
      '      <CommunicationPreferencesSection />',
    ],
    [
      '      <LanguageSection />',
      '      {/* One row, not three cards: the channels and every switch on them',
      '          live behind it, on /account/communication. The @handle is minted',
      '          by the server and is shown — with the link it produces — on the',
      '          profile itself, which is where somebody goes to share it. */}',
      '      <CommPreferenceEntryCard />',
    ],
    'section swap',
  ],
]);
