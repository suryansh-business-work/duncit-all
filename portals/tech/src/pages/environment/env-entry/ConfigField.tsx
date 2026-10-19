import { useState, type ChangeEvent, type FocusEvent } from 'react';
import { FormControl, FormControlLabel, FormHelperText, InputAdornment, Switch, TextField, Tooltip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { DuncitIconButton } from '@duncit/buttons';
import type { EnvFieldDef } from '../queries';

interface Props {
  field: EnvFieldDef;
  value: string;
  error?: string | false;
  helperText: string;
  required?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur: (e: FocusEvent<HTMLInputElement>) => void;
  onToggleBool: (name: string, checked: boolean) => void;
}

/** A boolean config value as a switch, its hint wired up as the description. */
function BoolConfigField({ field, value, helperText, onToggleBool }: Readonly<Pick<Props, 'field' | 'value' | 'helperText' | 'onToggleBool'>>) {
  const hintId = `config-${field.name}-hint`;
  return (
    <FormControl>
      <FormControlLabel
        control={
          <Switch
            checked={value === 'true'}
            onChange={(e) => onToggleBool(field.name, e.target.checked)}
            slotProps={{ input: { 'aria-describedby': helperText ? hintId : undefined } }}
          />
        }
        label={field.label}
      />
      {helperText ? <FormHelperText id={hintId} sx={{ mx: 0 }}>{helperText}</FormHelperText> : null}
    </FormControl>
  );
}

/** The eye toggle that reveals or masks a secret value. */
function RevealAdornment({ label, reveal, onToggle }: Readonly<{ label: string; reveal: boolean; onToggle: () => void }>) {
  return (
    <InputAdornment position="end">
      <Tooltip title={reveal ? 'Hide' : 'Show'}>
        <DuncitIconButton
          aria-label={reveal ? `Hide ${label}` : `Show ${label}`}
          edge="end"
          size="small"
          onClick={onToggle}
        >
          {reveal ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
        </DuncitIconButton>
      </Tooltip>
    </InputAdornment>
  );
}

/**
 * One environment config input. Booleans render as a switch; secrets render a
 * masked field with an eye toggle so the value can be revealed on demand
 * (nothing is hidden from the operator — only obscured by default).
 */
export default function ConfigField({ field, value, error, helperText, required, onChange, onBlur, onToggleBool }: Readonly<Props>) {
  const [reveal, setReveal] = useState(false);

  if (field.bool) {
    return <BoolConfigField field={field} value={value} helperText={helperText} onToggleBool={onToggleBool} />;
  }

  const visibleType = field.number ? 'number' : 'text';
  const type = field.secret && !reveal ? 'password' : visibleType;

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
      required={required}
      fullWidth
      autoComplete={field.secret ? 'new-password' : 'off'}
      slotProps={{
        input: field.secret
          ? { endAdornment: <RevealAdornment label={field.label} reveal={reveal} onToggle={() => setReveal((v) => !v)} /> }
          : undefined,

        htmlInput: { autoComplete: field.secret ? 'new-password' : 'off', 'data-1p-ignore': true, 'data-lpignore': true }
      }} />
  );
}
