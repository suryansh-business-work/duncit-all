import fs from 'node:fs';

const patch = (path, pairs) => {
  const raw = fs.readFileSync(path, 'utf8');
  const crlf = raw.includes('\r\n');
  let s = crlf ? raw.split('\r\n').join('\n') : raw;
  for (const [a, b] of pairs) {
    if (!s.includes(a)) throw new Error(`missing in ${path}: ${a.slice(0, 60)}`);
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(path, crlf ? s.split('\n').join('\r\n') : s);
  console.log('patched', path);
};

// EXPIRED is a lock in its own right now — a pod whose completion window ran
// out reads differently from one that was completed or cancelled.
patch('packages/utils/__tests__/pod-attendance-copy.test.ts', [
  [`const LOCKS: readonly PodAttendanceLock[] = ['OPEN', 'COMPLETED', 'CANCELLED'];`,
   `const LOCKS: readonly PodAttendanceLock[] = ['OPEN', 'COMPLETED', 'CANCELLED', 'EXPIRED'];`],

  [`  for (const lock of ['COMPLETED', 'CANCELLED'] as const) {
    labels.lockedTitle(lock);
    labels.lockedBody(lock);
  }`,
   `  for (const lock of ['COMPLETED', 'CANCELLED', 'EXPIRED'] as const) {
    labels.lockedTitle(lock);
    labels.lockedBody(lock);
  }`],

  [`  'lockedCompletedTitle', 'lockedCompletedBody', 'lockedCancelledTitle', 'lockedCancelledBody',`,
   `  'lockedCompletedTitle', 'lockedCompletedBody', 'lockedCancelledTitle', 'lockedCancelledBody',
  'lockedExpiredTitle', 'lockedExpiredBody',`],

  [`  it('explains a cancelled roster differently from a completed one', () => {
    const labels = build(recorder().t);
    expect(labels.lockedTitle('CANCELLED')).toBe(\`t:\${prefix}lockedCancelledTitle\`);
    expect(labels.lockedBody('CANCELLED')).toBe(\`t:\${prefix}lockedCancelledBody\`);
    expect(labels.lockedTitle('COMPLETED')).toBe(\`t:\${prefix}lockedCompletedTitle\`);
    expect(labels.lockedBody('COMPLETED')).toBe(\`t:\${prefix}lockedCompletedBody\`);
  });

  // An OPEN roster never renders the lock banner, so there are only two real
  // variants of the locked copy; anything that is not a cancellation reads as
  // the completed-and-settled case.
  it('treats any non-cancelled lock as the completed copy', () => {
    const labels = build(recorder().t);
    for (const lock of LOCKS.filter((l) => l !== 'CANCELLED')) {
      expect(labels.lockedTitle(lock)).toBe(\`t:\${prefix}lockedCompletedTitle\`);
      expect(labels.lockedBody(lock)).toBe(\`t:\${prefix}lockedCompletedBody\`);
    }
  });`,
   `  // Three reasons a roster is shut, and a host meeting a shut roster needs to
  // know WHICH: a cancellation is somebody's decision, an expiry is a window
  // they missed, and a completion is money already split.
  it('explains a cancelled, an expired and a completed roster each in its own words', () => {
    const labels = build(recorder().t);
    expect(labels.lockedTitle('CANCELLED')).toBe(\`t:\${prefix}lockedCancelledTitle\`);
    expect(labels.lockedBody('CANCELLED')).toBe(\`t:\${prefix}lockedCancelledBody\`);
    expect(labels.lockedTitle('EXPIRED')).toBe(\`t:\${prefix}lockedExpiredTitle\`);
    expect(labels.lockedBody('EXPIRED')).toBe(\`t:\${prefix}lockedExpiredBody\`);
    expect(labels.lockedTitle('COMPLETED')).toBe(\`t:\${prefix}lockedCompletedTitle\`);
    expect(labels.lockedBody('COMPLETED')).toBe(\`t:\${prefix}lockedCompletedBody\`);
  });

  // An OPEN roster never renders the lock banner at all, so it has no copy of
  // its own and falls through to the completed-and-settled wording.
  it('falls back to the completed copy for a lock with nothing of its own to say', () => {
    const labels = build(recorder().t);
    expect(labels.lockedTitle('OPEN')).toBe(\`t:\${prefix}lockedCompletedTitle\`);
    expect(labels.lockedBody('OPEN')).toBe(\`t:\${prefix}lockedCompletedBody\`);
  });`],
]);
