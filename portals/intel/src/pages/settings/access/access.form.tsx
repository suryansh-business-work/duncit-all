import { useMemo } from 'react';
import { Alert, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { RhfSelect, RhfSwitch, RhfTextField } from '@duncit/forms';
import { ENV_LABEL_KEYS, SOURCE_LABEL_KEYS } from '../../../components/sources';
import { NUMERIC } from '../fields';
import SectionForm from '../SectionForm';
import { ENVIRONMENTS, makeAccessSchema, SOURCES, type AccessOutput, type AccessValues } from './access.types';

export interface AccessFormProps {
  values: AccessValues;
  saving: boolean;
  disabled: boolean;
  errorMessage: string | null;
  onSubmit: (values: AccessOutput) => void;
}

const LEVELS = [
  { key: 'employee', label: 'intel.settings.access.employee' },
  { key: 'admin', label: 'intel.settings.access.admin' },
] as const;

/** Environments, sources, change requests and daily messages for each access level. Super Admins are never limited. */
export default function AccessForm({ values, saving, disabled, errorMessage, onSubmit }: Readonly<AccessFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeAccessSchema(t), [t]);
  const envOptions = ENVIRONMENTS.map((e) => ({ value: e, label: t(ENV_LABEL_KEYS[e] ?? 'intel.env.STAGING') }));
  const sourceOptions = SOURCES.map((s) => ({ value: s, label: t(SOURCE_LABEL_KEYS[s] ?? 'intel.sources.MEDIA') }));
  return (
    <SectionForm schema={schema} values={values} saving={saving} disabled={disabled} errorMessage={errorMessage} onSubmit={onSubmit}>
      {(control) => (
        <>
          <Alert severity={disabled ? 'info' : 'warning'}>{disabled ? t('intel.settings.superOnly') : t('intel.settings.access.productionWarning')}</Alert>
          {LEVELS.map((level) => (
            <div key={level.key}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{t(level.label)}</Typography>
              <RhfSelect control={control} name={`${level.key}.environments`} multiple label={t('intel.settings.access.environments')} options={envOptions} disabled={disabled} />
              <RhfSelect control={control} name={`${level.key}.sources`} multiple label={t('intel.settings.access.sources')} options={sourceOptions} disabled={disabled} />
              <RhfSwitch control={control} name={`${level.key}.can_request_writes`} label={t('intel.settings.access.canWrite')} hint={t('intel.settings.access.canWriteHint')} disabled={disabled} />
              <RhfTextField control={control} name={`${level.key}.messages_per_day`} label={t('intel.settings.access.perDay')} disabled={disabled} {...NUMERIC} />
            </div>
          ))}
          <Typography variant="caption" color="text.secondary">{t('intel.settings.access.rolesNote')}</Typography>
        </>
      )}
    </SectionForm>
  );
}
