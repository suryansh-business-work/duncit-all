import { useMemo } from 'react';
import { Alert } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { RhfSwitch, RhfTextField } from '@duncit/forms';
import { NUMERIC } from '../fields';
import SectionForm from '../SectionForm';
import { makeSecuritySchema, type SecurityOutput, type SecurityValues } from './security.types';

export interface SecurityFormProps {
  values: SecurityValues;
  saving: boolean;
  disabled: boolean;
  errorMessage: string | null;
  onSubmit: (values: SecurityOutput) => void;
}

/** Production approvals, rate limits, the MCP host allow-list and the injection guard. */
export default function SecurityForm({ values, saving, disabled, errorMessage, onSubmit }: Readonly<SecurityFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeSecuritySchema(t), [t]);
  return (
    <SectionForm schema={schema} values={values} saving={saving} disabled={disabled} errorMessage={errorMessage} onSubmit={onSubmit}>
      {(control) => (
        <>
          {disabled && <Alert severity="info">{t('intel.settings.superOnly')}</Alert>}
          <RhfSwitch control={control} name="four_eyes_production" label={t('intel.settings.security.fourEyes')} hint={t('intel.settings.security.fourEyesHint')} disabled={disabled} />
          <RhfTextField control={control} name="approval_expiry_hours" label={t('intel.settings.security.expiry')} disabled={disabled} {...NUMERIC} />
          <RhfTextField control={control} name="messages_per_minute" label={t('intel.settings.security.perMinute')} disabled={disabled} {...NUMERIC} />
          <RhfTextField control={control} name="mcp_allowed_hosts" label={t('intel.settings.security.hosts')} hint={t('intel.settings.security.hostsHint')} multiline minRows={2} disabled={disabled} />
          <RhfSwitch control={control} name="block_injection" label={t('intel.settings.security.blockInjection')} hint={t('intel.settings.security.blockInjectionHint')} disabled={disabled} />
        </>
      )}
    </SectionForm>
  );
}
