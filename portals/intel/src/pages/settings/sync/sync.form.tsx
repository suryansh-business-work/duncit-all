import { useMemo } from 'react';
import { useTranslation } from '@duncit/app-settings';
import { RhfSwitch, RhfTextField } from '@duncit/forms';
import { NUMERIC } from '../fields';
import SectionForm from '../SectionForm';
import { makeSyncSchema, type SyncOutput, type SyncValues } from './sync.types';

export interface SyncFormProps {
  values: SyncValues;
  saving: boolean;
  errorMessage: string | null;
  onSubmit: (values: SyncOutput) => void;
}

/** Pause every sync, how often connectors are refreshed, and how much one run may read. */
export default function SyncForm({ values, saving, errorMessage, onSubmit }: Readonly<SyncFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeSyncSchema(t), [t]);
  return (
    <SectionForm schema={schema} values={values} saving={saving} errorMessage={errorMessage} onSubmit={onSubmit}>
      {(control) => (
        <>
          <RhfSwitch control={control} name="paused" label={t('intel.settings.sync.paused')} hint={t('intel.settings.sync.pausedHint')} />
          <RhfTextField control={control} name="interval_minutes" label={t('intel.settings.sync.interval')} hint={t('intel.settings.sync.intervalHint')} {...NUMERIC} />
          <RhfTextField control={control} name="max_items_per_run" label={t('intel.settings.sync.maxItems')} hint={t('intel.settings.sync.maxItemsHint')} {...NUMERIC} />
        </>
      )}
    </SectionForm>
  );
}
