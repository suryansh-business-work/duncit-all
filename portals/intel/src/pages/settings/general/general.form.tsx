import { useMemo } from 'react';
import { useTranslation } from '@duncit/app-settings';
import { RhfSelect, RhfSwitch, RhfTextField } from '@duncit/forms';
import { ENV_LABEL_KEYS } from '../../../components/sources';
import SectionForm from '../SectionForm';
import { ENV_CHOICES, makeGeneralSchema, type GeneralOutput, type GeneralValues } from './general.types';

export interface GeneralFormProps {
  values: GeneralValues;
  saving: boolean;
  errorMessage: string | null;
  onSubmit: (values: GeneralOutput) => void;
}

/** Title, description, the default environment a new chat starts in, and automatic sync. */
export default function GeneralForm({ values, saving, errorMessage, onSubmit }: Readonly<GeneralFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeGeneralSchema(t), [t]);
  const envOptions = ENV_CHOICES.map((e) => ({ value: e, label: t(ENV_LABEL_KEYS[e] ?? 'intel.env.STAGING') }));
  return (
    <SectionForm schema={schema} values={values} saving={saving} errorMessage={errorMessage} onSubmit={onSubmit}>
      {(control) => (
        <>
          <RhfTextField control={control} name="app_title" label={t('intel.settings.general.appTitle')} required slotProps={{ htmlInput: { maxLength: 60 } }} />
          <RhfTextField control={control} name="description" label={t('intel.settings.general.description')} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 300 } }} />
          <RhfSelect control={control} name="default_environment" label={t('intel.settings.general.defaultEnvironment')} hint={t('intel.settings.general.defaultEnvironmentHint')} options={envOptions} />
          <RhfSwitch control={control} name="auto_sync" label={t('intel.settings.general.autoSync')} hint={t('intel.settings.general.autoSyncHint')} />
        </>
      )}
    </SectionForm>
  );
}
