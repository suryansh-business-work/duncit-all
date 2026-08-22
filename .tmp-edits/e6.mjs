import { readFileSync, writeFileSync } from 'node:fs';
const p = 'app/mweb/src/theme.ts';
let s = readFileSync(p, 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';
const o = [
  '    MuiTextField: {',
  "      defaultProps: { variant: 'outlined', size: 'small' },",
  '    },',
].join(eol);
const n = [
  '    MuiTextField: {',
  "      defaultProps: { variant: 'outlined', size: 'small' },",
  '    },',
  '    MuiInputBase: {',
  '      styleOverrides: {',
  '        /**',
  "         * MUI's default placeholder is `currentColor` at `opacity: .42` — on",
  '         * our ink that lands around 3:1 against the field, under the 4.5:1',
  '         * WCAG floor, and on a filled grey field it reads as a disabled',
  '         * control rather than a hint. The muted ink at full opacity is the',
  "         * same colour every helper line uses, so a hint now looks like a hint.",
  '         * `input` covers `<textarea>` too — both carry `.MuiInputBase-input`.',
  '         */',
  '        input: {',
  "          '&::placeholder': { color: MUTED, opacity: 1 },",
  '        },',
  '      },',
  '    },',
].join(eol);
if (!s.includes(o)) { console.error('NOT FOUND'); process.exit(1); }
writeFileSync(p, s.replace(o, n));
console.log('ok');
