import fs from 'node:fs';

const P = 'packages/utils/src/pod-attendance.ts';
const raw = fs.readFileSync(P, 'utf8');
const crlf = raw.includes('\r\n');
let s = crlf ? raw.split('\r\n').join('\n') : raw;
const rep = (a, b) => {
  if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 60));
  s = s.replace(a, () => b);
};

rep(
  `export function duplicateCompanionIndexes(
  entries: readonly CompanionEntry[],
  reserved: readonly string[]
): Set<number> {
  const taken = new Set<string>();
  for (const line of reserved) {
    const key = phoneKey(line);
    if (key) taken.add(key);
  }
  for (const entry of entries) {
    if (entry.otp_challenge_id) taken.add(phoneKey(entry.phone_extension, entry.phone_number));
  }

  const repeats = new Set<number>();
  entries.forEach((entry, index) => {
    if (entry.otp_challenge_id) return;
    const key = phoneKey(entry.phone_extension, entry.phone_number);
    if (!key) return;
    if (taken.has(key)) repeats.add(index);
    else taken.add(key);
  });
  return repeats;
}`,
  `export function duplicateCompanionIndexes(
  entries: readonly CompanionEntry[],
  reserved: readonly string[]
): Set<number> {
  const taken = new Set<string>();
  for (const line of reserved) {
    const key = phoneKey(line);
    if (key) taken.add(key);
  }
  for (const entry of entries) {
    if (entry.otp_challenge_id) taken.add(entryPhoneKey(entry));
  }

  const repeats = new Set<number>();
  entries.forEach((entry, index) => {
    if (entry.otp_challenge_id) return;
    const key = entryPhoneKey(entry);
    if (!key) return;
    if (taken.has(key)) repeats.add(index);
    else taken.add(key);
  });
  return repeats;
}`,
);

rep(
  `/**
 * The rows whose number somebody else already has.`,
  `/**
 * What one row compares by — '' until the host has actually typed a number.
 *
 * Keying the whole row would read the PREFILLED DIAL CODE as a phone number:
 * every blank row on a fresh multi-seat ticket carries \`DEFAULT_DIAL_CODE\`, so
 * \`phoneKey('+91', '')\` is \`'91'\` and every row after the first would be
 * reported as a repeat of it before anybody typed anything.
 */
const entryPhoneKey = (entry: Readonly<CompanionEntry>): string =>
  entry.phone_number.trim() ? phoneKey(entry.phone_extension, entry.phone_number) : '';

/**
 * The rows whose number somebody else already has.`,
);

fs.writeFileSync(P, crlf ? s.split('\n').join('\r\n') : s);
console.log('patched', P);
