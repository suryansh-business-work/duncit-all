import { readFileSync, writeFileSync } from 'node:fs';
const p = 'server/src/modules/access/user/user.service.ts';
let s = readFileSync(p, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';
const L = (a) => a.join(eol);

const anchor = L([
  '/** The handle that is free for this account, or null when it is not. */',
]);
if (!s.includes(anchor)) { console.error('anchor NOT FOUND'); process.exit(1); }
const helper = L([
  '/**',
  ' * Give an account the @handle it should have been created with.',
  ' *',
  ' * Every account made since handles shipped is minted one at signup, but the',
  ' * ones made before that have none — and a profile with no handle has no',
  ' * shareable link at all, only a storage id. There is no field for a member to',
  " * fix that with any more, so the platform fixes it: `me` is the one read every",
  ' * such account performs, which makes it the place the gap closes.',
  ' *',
  ' * The cost on an account that already has one is a property check, not a',
  ' * query. The write is guarded on the handle still being absent, so two devices',
  ' * opening the app at once mint one handle rather than overwriting each other,',
  ' * and it never throws: an account is perfectly usable without a handle, and a',
  ' * failed backfill must not take the profile down with it.',
  ' */',
  'async function ensureUsername<T extends { profile?: { username?: string | null } } | null>(',
  '  doc: T',
  '): Promise<T> {',
  '  if (!doc || doc.profile?.username) return doc;',
  '  const id = (doc as any)._id;',
  '  try {',
  '    const first = (doc as any).profile?.first_name ?? null;',
  '    const last = (doc as any).profile?.last_name ?? null;',
  '    const username = await nextFreeUsername(first, last);',
  '    if (!username) return doc;',
  '    // `$in: [null, ""]` matches a MISSING field as well as an empty one, so',
  '    // the guard covers every shape a handle-less document comes in.',
  '    const claimed = await UserModel.findOneAndUpdate(',
  "      { _id: id, 'profile.username': { $in: [null, ''] } },",
  "      { $set: { 'profile.username': username } },",
  '      { new: true }',
  '    );',
  '    // Null means another request minted one first — re-read rather than',
  '    // hand back the stale document the caller is about to serialise.',
  '    return ((claimed ?? (await UserModel.findById(id))) ?? doc) as T;',
  '  } catch (error) {',
  "    logs.server.warn('user.service', 'ensureUsername', { error });",
  '    return doc;',
  '  }',
  '}',
  '',
]);
s = s.replace(anchor, helper + anchor);

const meOld = L([
  '  async me(id: string) {',
  '    const u = await UserModel.findById(id);',
  '    return toPublic(u);',
  '  },',
]);
if (!s.includes(meOld)) { console.error('me NOT FOUND'); process.exit(1); }
const meNew = L([
  '  async me(id: string) {',
  '    const u = await UserModel.findById(id);',
  '    // Handles are assigned, never typed — see ensureUsername.',
  '    return toPublic(await ensureUsername(u));',
  '  },',
]);
s = s.replace(meOld, meNew);
writeFileSync(p, s);
console.log('ok');
