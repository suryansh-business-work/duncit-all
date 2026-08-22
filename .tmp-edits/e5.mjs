import { readFileSync, writeFileSync } from 'node:fs';
const p = 'app/mweb/src/pages/profile-page/ProfileHeader.tsx';
let s = readFileSync(p, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';
const pairs = [
  [
    ["import ProfileAvatar from '../../components/profile-avatar';"],
    [
      "import ProfileAvatar from '../../components/profile-avatar';",
      "import ProfileHandleLink from './ProfileHandleLink';",
    ],
    'import',
  ],
  [
    [
      '          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }} noWrap>',
      '            {me.username ? `@${me.username}` : (me.email ?? `@${me.user_id}`)}',
      '          </Typography>',
    ],
    [
      '          {/* The handle is also the share link — tapping it copies',
      '              `/u/<handle>`, which is why it lives here and not in',
      '              settings (native shows the same, rule 27). */}',
      '          <ProfileHandleLink',
      '            username={me.username ?? null}',
      '            fallback={me.email ?? `@${me.user_id}`}',
      '          />',
    ],
    'handle line',
  ],
];
for (const [o, n, tag] of pairs) {
  const oo = o.join(eol);
  if (!s.includes(oo)) { console.error('NOT FOUND: ' + tag); process.exit(1); }
  s = s.replace(oo, n.join(eol));
}
writeFileSync(p, s);
console.log('ok');
