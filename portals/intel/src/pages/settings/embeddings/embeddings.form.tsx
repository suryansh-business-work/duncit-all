import { useMemo } from 'react';
import { Alert } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { RhfTextField } from '@duncit/forms';
import { NUMERIC as num } from '../fields';
import SectionForm from '../SectionForm';
import { makeEmbeddingsSchema, type EmbeddingsOutput, type EmbeddingsValues } from './embeddings.types';

export interface EmbeddingsFormProps {
  values: EmbeddingsValues;
  saving: boolean;
  errorMessage: string | null;
  onSubmit: (values: EmbeddingsOutput) => void;
}

/** The embedding model and how documents are chunked and retrieved. */
export default function EmbeddingsForm({ values, saving, errorMessage, onSubmit }: Readonly<EmbeddingsFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeEmbeddingsSchema(t), [t]);
  return (
    <SectionForm schema={schema} values={values} saving={saving} errorMessage={errorMessage} onSubmit={onSubmit}>
      {(control) => (
        <>
          <Alert severity="info">{t('intel.settings.embeddings.rebuildNote')}</Alert>
          <RhfTextField control={control} name="model" label={t('intel.settings.embeddings.model')} hint={t('intel.settings.embeddings.modelHint')} required />
          <RhfTextField control={control} name="dimensions" label={t('intel.settings.embeddings.dimensions')} hint={t('intel.settings.embeddings.dimensionsHint')} {...num} />
          <RhfTextField control={control} name="chunk_chars" label={t('intel.settings.embeddings.chunkChars')} {...num} />
          <RhfTextField control={control} name="chunk_overlap" label={t('intel.settings.embeddings.chunkOverlap')} {...num} />
          <RhfTextField control={control} name="top_k" label={t('intel.settings.embeddings.topK')} hint={t('intel.settings.embeddings.topKHint')} {...num} />
        </>
      )}
    </SectionForm>
  );
}
