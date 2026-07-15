import { InputAdornment, TextField } from '@mui/material';

const HEX = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_COLOR = '#1976d2';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
}

/**
 * MUI color field: a typable hex TextField with a native `<input type="color">`
 * swatch adornment. Both bind to the same string value; the swatch normalises to a
 * valid hex so it never misrenders while the text field keeps whatever was typed.
 */
export default function ColorField({ label, value, onChange, helperText }: Readonly<Props>) {
  const swatch = HEX.test(value) ? value : DEFAULT_COLOR;
  return (
    <TextField
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
      placeholder={DEFAULT_COLOR}
      helperText={helperText}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <input
              type="color"
              aria-label={`${label} picker`}
              value={swatch}
              onChange={(e) => onChange(e.target.value)}
              style={{
                width: 28,
                height: 28,
                border: 'none',
                background: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            />
          </InputAdornment>
        ),
      }}
    />
  );
}
