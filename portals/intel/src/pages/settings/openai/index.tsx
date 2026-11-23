import { useQuery } from '@apollo/client/react';
import { Alert, Skeleton } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { INTEL_ENTRY_OPTIONS, type EntryOptionsData } from '../../../graphql/admin';
import SettingsCard from '../SettingsCard';
import OpenAiForm from './openai.form';

export { default as OpenAiForm } from './openai.form';
export { makeOpenAiSchema } from './openai.types';

/** Settings › OpenAI API. Keys are created and tested in Tech › Environment › OpenAI. */
export default function OpenAiSection() {
  const { t } = useTranslation();
  const entries = useQuery<EntryOptionsData>(INTEL_ENTRY_OPTIONS, { variables: { kind: 'OPENAI' } });
  return (
    <SettingsCard section="openai" title={t('intel.settings.sections.openai')} subtitle={t('intel.settings.openai.subtitle')}>
      {({ value, saving, errorMessage, onSave }) => (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>{t('intel.settings.techPortalNote')}</Alert>
          {entries.loading && !entries.data ? <Skeleton variant="rounded" height={64} /> : <OpenAiForm values={value} entries={entries.data?.intelEntryOptions ?? []} saving={saving} errorMessage={errorMessage} onSubmit={onSave} />}
        </>
      )}
    </SettingsCard>
  );
}
