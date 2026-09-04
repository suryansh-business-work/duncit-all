import fs from 'node:fs';
const P = 'packages/utils/__tests__/pod-attendance-copy.test.ts';
const raw = fs.readFileSync(P, 'utf8');
const crlf = raw.includes('\r\n');
let s = crlf ? raw.split('\r\n').join('\n') : raw;
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0,50)); s = s.replace(a, () => b); };

// The completion deadline's two lines are closures like every other; the
// exercise pass has to read them or their keys ship unrendered.
rep(`  labels.otpBody('Asha');`,
`  labels.deadlineTitle('10 Sep 2026, 6:30 PM');
  labels.deadlineBody(48);
  labels.otpBody('Asha');`);

rep(`  'lockedExpiredTitle', 'lockedExpiredBody',`,
`  'lockedExpiredTitle', 'lockedExpiredBody', 'deadlineTitle', 'deadlineBody',`);
fs.writeFileSync(P, crlf ? s.split('\n').join('\r\n') : s);
console.log('patched', P);
