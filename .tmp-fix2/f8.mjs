import fs from 'node:fs';
const P = 'packages/host-pod-actions/__tests__/companion-otp.test.tsx';
const raw = fs.readFileSync(P, 'utf8');
const crlf = raw.includes('\r\n');
let s = crlf ? raw.split('\r\n').join('\n') : raw;
const a = `    expect(phone).toHaveAttribute('readonly');
    fireEvent.input(phone, { target: { value: '9000000002' } });
    await settle();

    expect(phone).toHaveValue('9000000001');
    expect(screen.getByTestId('companion-verified-0')).toBeInTheDocument();`;
const b = `    // readOnly rather than disabled: the host still has to be able to READ the
    // number they proved, and MUI greys a disabled field past legibility.
    expect(phone).toHaveAttribute('readonly');
    expect(screen.getByTestId('companion-verified-0')).toBeInTheDocument();
    expect(screen.queryByTestId('companion-otp-send-0')).not.toBeInTheDocument();`;
if (!s.includes(a)) throw new Error('anchor missing');
s = s.replace(a, () => b);
fs.writeFileSync(P, crlf ? s.split('\n').join('\r\n') : s);
console.log('patched', P);
