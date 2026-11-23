import { useMemo } from 'react';
import type { IntelEntryOption } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { RhfSelect } from '@duncit/forms';
import SectionForm from '../SectionForm';
import { makeOpenAiSchema, type OpenAiOutput, type OpenAiValues } from './openai.types';

export interface OpenAiFormProps {
  values: OpenAiValues;
  entries: IntelEntryOption[];
  saving: boolean;
  errorMessage: string | null;
  onSubmit: (values: OpenAiOutput) => void;
}

/** Pick the OpenAI key by its Tech portal name — the key itself never reaches this page. */
export default function OpenAiForm({ values, entries, saving, errorMessage, onSubmit }: Readonly<OpenAiFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeOpenAiSchema(t, entries.map((e) => e.id)), [t, entries]);
  const options = [{ value: '', label: t('intel.settings.openai.techDefault') }, ...entries.map((e) => ({ value: e.id, label: e.is_default ? t('intel.settings.entryDefault', { vars: { name: e.name } }) : e.name }))];
  return (
    <SectionForm schema={schema} values={values} saving={saving} errorMessage={errorMessage} onSubmit={onSubmit}>
      {(control) => <RhfSelect control={control} name="env_entry_id" label={t('intel.settings.openai.entry')} hint={t('intel.settings.openai.entryHint')} options={options} />}
    </SectionForm>
  );
}
