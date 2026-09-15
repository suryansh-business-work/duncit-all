import { InputAdornment, TextField } from '@mui/material';

const HEX = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_COLOR = '#1976d2';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  /** Shown while the field is blank; a hex placeholder also colours the swatch. */
  placeholder?: string;
  error?: boolean;
  size?: 'small' | 'medium';
}

/**
 * MUI color field: a typable hex TextField with a native `<input type="color">`
 * swatch adornment. Both bind to the same string value; the swatch normalises to a
 * valid hex so it never misrenders while the text field keeps whatever was typed.
 */
export default function ColorField({
  label,
  value,
  onChange,
  helperText,
  placeholder = DEFAULT_COLOR,
  error,
  size,
}: Readonly<Props>) {
  const blankSwatch = HEX.test(placeholder) ? placeholder : DEFAULT_COLOR;
  const swatch = HEX.test(value) ? value : blankSwatch;
  return (
    <TextField
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
      placeholder={placeholder}
      helperText={helperText}
      error={error}
      size={size}
      slotProps={{
        input: {
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
        }
      }}
    />
  );
}
