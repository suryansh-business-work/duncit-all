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

edit('app/mobile-app/src/components/profile/ProfileHeader.tsx', [
  [
    ["import { ProfileAvatar } from '@/components/profile/ProfileAvatar';"],
    [
      "import { ProfileAvatar } from '@/components/profile/ProfileAvatar';",
      "import { ProfileHandleLink } from '@/components/profile/ProfileHandleLink';",
    ],
    'import',
  ],
  [
    [
      '          <Text fontSize={13} color="$muted" numberOfLines={1}>',
      "            {me.username ? `@${me.username}` : (me.email ?? '—')}",
      '          </Text>',
    ],
    [
      '          {/* The handle is also the share link — tapping it copies',
      '              `/u/<handle>`, which is why it lives here and not in',
      '              settings (mWeb shows the same, rule 27). */}',
      "          <ProfileHandleLink username={me.username ?? null} fallback={me.email ?? '—'} />",
    ],
    'handle line',
  ],
]);

// Placeholders that fell through to the OS grey. Tamagui's Input/TextArea does
// NOT read `$placeholderColor` from the theme on native — RN needs the prop.
edit('app/mobile-app/src/components/details/ProductReviews.tsx', [
  [['        placeholder={t(', "'mweb.productDetail.shareWhatYouThought')}"], null, 'probe'],
]);
