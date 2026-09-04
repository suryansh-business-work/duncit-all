import fs from 'node:fs';
const P = 'packages/utils/__tests__/pod-companions.test.ts';
const raw = fs.readFileSync(P, 'utf8');
const crlf = raw.includes('\r\n');
let s = crlf ? raw.split('\r\n').join('\n') : raw;
const a = `  // A row nobody has filled in yet is not a duplicate of the other empty rows.
  it('says nothing about rows with no number typed yet', () => {
    const rows = [entry({ phone_number: '' }), entry({ phone_number: '  ' })];
    expect(duplicateCompanionIndexes(rows, []).size).toBe(0);
  });`;
const b = `  // Every blank row on a fresh ticket carries the prefilled dial code, so a
  // check that keyed the whole row would read '+91' as a phone number and
  // report every row after the first as a repeat before anybody typed.
  it('says nothing about rows with no number typed yet, dial code and all', () => {
    const rows = [entry({ phone_number: '' }), entry({ phone_number: '  ' }), entry({ phone_number: '' })];
    expect(duplicateCompanionIndexes(rows, []).size).toBe(0);
  });

  it('does not let a blank row shadow a real number typed under the same dial code', () => {
    const rows = [entry({ phone_number: '' }), entry({ phone_number: '9845012345' })];
    expect(duplicateCompanionIndexes(rows, []).size).toBe(0);
  });`;
if (!s.includes(a)) throw new Error('anchor missing');
s = s.replace(a, () => b);
fs.writeFileSync(P, crlf ? s.split('\n').join('\r\n') : s);
console.log('patched', P);
