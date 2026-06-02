import { useState, type ChangeEvent, type FocusEvent } from 'react';
import { FormControlLabel, IconButton, InputAdornment, Switch, TextField, Tooltip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import type { EnvFieldDef } from '../queries';

interface Props {
  field: EnvFieldDef;
  value: string;
  error?: string | false;
  helperText: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur: (e: FocusEvent<HTMLInputElement>) => void;
  onToggleBool: (name: string, checked: boolean) => void;
}

/**
 * One environment config input. Booleans render as a switch; secrets render a
 * masked field with an eye toggle so the value can be revealed on demand
 * (nothing is hidden from the operator — only obscured by default).
 */
export default function ConfigField({ field, value, error, helperText, onChange, onBlur, onToggleBool }: Props) {
  const [reveal, setReveal] = useState(false);

  if (field.bool) {
    return (
      <FormControlLabel
        control={
          <Switch checked={value === 'true'} onChange={(e) => onToggleBool(field.name, e.target.checked)} />
        }
        label={field.label}
      />
    );
  }

  const type = field.secret && !reveal ? 'password' : field.number ? 'number' : 'text';

  return (
    <TextField
      label={field.label}
      name={`config.${field.name}`}
      type={type}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      error={Boolean(error)}
      helperText={error || helperText}
      placeholder={field.hint ?? undefined}
      fullWidth
      autoComplete={field.secret ? 'new-password' : 'off'}
      inputProps={{ autoComplete: field.secret ? 'new-password' : 'off', 'data-1p-ignore': true, 'data-lpignore': true }}
      InputProps={
        field.secret
          ? {
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={reveal ? 'Hide' : 'Show'}>
                    <IconButton
                      aria-label={reveal ? `Hide ${field.label}` : `Show ${field.label}`}
                      edge="end"
                      size="small"
                      onClick={() => setReveal((v) => !v)}
                    >
                      {reveal ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }
          : undefined
      }
    />
  );
}
