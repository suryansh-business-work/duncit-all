import { useMemo } from 'react';
import { useField, useFormikContext } from 'formik';
import { InputAdornment, MenuItem, TextField } from '@mui/material';

/**
 * Static country extension list — kept in code because it never changes
 * and is needed offline for the contacts form. Each row is the ISO-2
 * country code (used only as a key), the user-visible label and the dial
 * code stored alongside the phone number.
 */
const COUNTRY_CODES: { code: string; label: string; dial: string }[] = [
  { code: 'IN', label: '🇮🇳 IN', dial: '+91' },
  { code: 'US', label: '🇺🇸 US', dial: '+1' },
  { code: 'GB', label: '🇬🇧 UK', dial: '+44' },
  { code: 'AE', label: '🇦🇪 AE', dial: '+971' },
  { code: 'AU', label: '🇦🇺 AU', dial: '+61' },
  { code: 'SG', label: '🇸🇬 SG', dial: '+65' },
  { code: 'CA', label: '🇨🇦 CA', dial: '+1' },
  { code: 'NZ', label: '🇳🇿 NZ', dial: '+64' },
  { code: 'BD', label: '🇧🇩 BD', dial: '+880' },
  { code: 'LK', label: '🇱🇰 LK', dial: '+94' },
  { code: 'NP', label: '🇳🇵 NP', dial: '+977' },
  { code: 'PK', label: '🇵🇰 PK', dial: '+92' },
  { code: 'DE', label: '🇩🇪 DE', dial: '+49' },
  { code: 'FR', label: '🇫🇷 FR', dial: '+33' },
];

interface Props {
  name: string;
  label: string;
  size?: 'small' | 'medium';
  required?: boolean;
}

/** Combines a country-code dropdown with the phone field on a single line. */
export default function PhoneField({ name, label, size = 'small', required }: Readonly<Props>) {
  const [numberField, numberMeta] = useField<string>(name);
  const extName = `${name}_ext`;
  const [extField] = useField<string>(extName);
  const formik = useFormikContext<Record<string, unknown>>();

  const currentDial = extField.value || '+91';
  const showError = Boolean(numberMeta.error && (numberMeta.touched || numberMeta.value !== numberMeta.initialValue));

  const onDialChange = (next: string) => {
    formik.setFieldValue(extName, next, false);
  };

  const codeOptions = useMemo(
    () => COUNTRY_CODES.map((c) => ({ key: `${c.code}-${c.dial}`, ...c })),
    []
  );

  return (
    <TextField
      {...numberField}
      label={label}
      size={size}
      fullWidth
      required={required}
      error={showError}
      helperText={showError ? (numberMeta.error as string) : ' '}
      inputProps={{ inputMode: 'numeric' }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start" sx={{ mr: 0.5 }}>
            <TextField
              select
              value={currentDial}
              onChange={(e) => onDialChange(e.target.value)}
              size={size}
              variant="standard"
              sx={{
                minWidth: 78,
                '& .MuiInput-underline:before': { borderBottom: 'none' },
                '& .MuiInput-underline:after': { borderBottom: 'none' },
                '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
              }}
              SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 320 } } } }}
            >
              {codeOptions.map((opt) => (
                <MenuItem key={opt.key} value={opt.dial}>
                  {opt.label} {opt.dial}
                </MenuItem>
              ))}
            </TextField>
          </InputAdornment>
        ),
      }}
    />
  );
}
