import { useState } from 'react';
import type { Control } from 'react-hook-form';
import { InputAdornment } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { IntegrationFieldDef } from '../../brand-wizard/steps/integration-forms';
import type { ConnectionFormValues } from './connection.types';

interface Props {
  control: Control<ConnectionFormValues>;
  field: IntegrationFieldDef;
  /** The provider in lower case — the test id's middle part. */
  providerKey: string;
  /** This field's secret is already saved, so it may be left blank. */
  secretOnFile: boolean;
  /** Kept and shown, but not in use — the production user while sandbox mode is on. */
  disabled?: boolean;
}

/**
 * One credential input of a saved connection. A password or key is masked, with
 * an eye button that shows what was typed so it can be checked before saving.
 */
export default function CredentialField({ control, field, providerKey, secretOnFile, disabled = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);
  const masked = field.type === 'password';
  const toggleLabel = t(shown ? 'partners.brandWizard.integration.hideSecret' : 'partners.brandWizard.integration.showSecret', {
    vars: { field: field.label },
  });
  const eye = (
    <InputAdornment position="end">
      <DuncitIconButton
        size="small"
        edge="end"
        disabled={disabled}
        onClick={() => setShown((value) => !value)}
        aria-label={toggleLabel}
        data-testid={`integration-${providerKey}-${field.name}-toggle`}
      >
        {shown ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
      </DuncitIconButton>
    </InputAdornment>
  );

  return (
    <RhfTextField
      control={control}
      name={field.name}
      label={field.label}
      type={masked && shown ? 'text' : (field.type ?? 'text')}
      required={field.required}
      disabled={disabled}
      autoComplete={masked ? 'new-password' : 'off'}
      hint={field.secret && secretOnFile ? t('partners.brandWizard.integration.secretKept') : field.hint}
      slotProps={masked ? { input: { endAdornment: eye } } : undefined}
      data-testid={`integration-${providerKey}-${field.name}`}
    />
  );
}
