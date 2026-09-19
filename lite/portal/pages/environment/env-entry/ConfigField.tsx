import { useState } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { FormControlLabel, InputAdornment, Switch, TextField } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { DuncitIconButton } from '@duncit/buttons';
import { usePortalT } from '../../../../shared/i18n';
import type { LiteEnvFieldDef } from '../../../graphql/environment';
import type { EnvEntryFormValues } from './env-entry.types';

interface Props {
  control: Control<EnvEntryFormValues>;
  field: LiteEnvFieldDef;
  /** The stored entry already holds this secret, so blank means keep it. */
  secretKept: boolean;
  disabled: boolean;
}

/**
 * One config input, shaped by the server's field definition: a switch for a
 * boolean, a masked box with an eye toggle for a secret, a numeric box for a
 * number, plain text otherwise. The hint under it is the vendor's own words.
 */
export function ConfigField({ control, field, secretKept, disabled }: Readonly<Props>) {
  const { t } = usePortalT();
  const [reveal, setReveal] = useState(false);
  const name = `config.${field.name}` as const;

  if (field.bool) {
    return (
      <Controller
        control={control}
        name={name}
        defaultValue=""
        render={({ field: rhf }) => (
          <FormControlLabel
            control={<Switch checked={rhf.value === 'true'} onChange={(event) => rhf.onChange(event.target.checked ? 'true' : 'false')} disabled={disabled} slotProps={{ input: { ref: rhf.ref } }} />}
            label={field.label}
          />
        )}
      />
    );
  }

  let helper = field.hint ?? ' ';
  if (field.secret) helper = secretKept ? t('litePortal.environment.secretKeep') : t('litePortal.environment.secretRequired');
  const type = field.secret && !reveal ? 'password' : 'text';
  const revealLabel = reveal ? t('litePortal.environment.hide', { vars: { label: field.label } }) : t('litePortal.environment.show', { vars: { label: field.label } });

  return (
    <Controller
      control={control}
      name={name}
      defaultValue=""
      render={({ field: rhf, fieldState }) => (
        <TextField
          label={field.label}
          type={type}
          value={rhf.value ?? ''}
          onChange={rhf.onChange}
          onBlur={rhf.onBlur}
          inputRef={rhf.ref}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message ?? helper}
          required={field.secret && !secretKept}
          disabled={disabled}
          fullWidth
          autoComplete={field.secret ? 'new-password' : 'off'}
          slotProps={{
            htmlInput: { inputMode: field.number ? 'numeric' : undefined, 'data-testid': `env-config-${field.name}`, 'data-1p-ignore': true, 'data-lpignore': true },
            input: field.secret
              ? {
                  endAdornment: (
                    <InputAdornment position="end">
                      <DuncitIconButton aria-label={revealLabel} aria-pressed={reveal} edge="end" size="small" onClick={() => setReveal((value) => !value)} data-testid={`env-config-${field.name}-reveal`}>
                        {reveal ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </DuncitIconButton>
                    </InputAdornment>
                  ),
                }
              : undefined,
          }}
        />
      )}
    />
  );
}
