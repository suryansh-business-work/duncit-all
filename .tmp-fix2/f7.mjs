import fs from 'node:fs';
const P = 'packages/host-pod-actions/__tests__/companion-otp.test.tsx';
const raw = fs.readFileSync(P, 'utf8');
const crlf = raw.includes('\r\n');
let s = crlf ? raw.split('\r\n').join('\n') : raw;
const a = `  it('throws the proof away when the number under it is retyped', async () => {`;
const b = `  it('settles the row so the proved number can no longer be retyped', async () => {`;
if (!s.includes(a)) throw new Error('anchor missing');
s = s.replace(a, () => b);

const oldTail = `    // The host corrects the number. The code proved the OLD one.
    fireEvent.input(phone, { target: { value: '9000000002' } });
    await settle();

    expect(screen.queryByTestId('companion-verified-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('companion-otp-send-0')).toBeInTheDocument();
  });`;
const newTail = `    // A row that stayed editable dropped its tick the moment a digit changed,
    // leaving a host who corrected a typo staring at an unverified row with no
    // reason given — and letting a deliberate edit carry the proof of one
    // number onto another. Settled rows read back as text instead.
    expect(phone).toHaveAttribute('readonly');
    fireEvent.input(phone, { target: { value: '9000000002' } });
    await settle();

    expect(phone).toHaveValue('9000000001');
    expect(screen.getByTestId('companion-verified-0')).toBeInTheDocument();
  });`;
if (!s.includes(oldTail)) throw new Error('tail anchor missing');
s = s.replace(oldTail, () => newTail);
fs.writeFileSync(P, crlf ? s.split('\n').join('\r\n') : s);
console.log('patched', P);
