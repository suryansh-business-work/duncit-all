import { useTranslation } from '@duncit/app-settings';
import SettingsCard from '../SettingsCard';
import EmbeddingsForm from './embeddings.form';

export { default as EmbeddingsForm } from './embeddings.form';
export { makeEmbeddingsSchema } from './embeddings.types';

/** Settings › Embeddings. */
export default function EmbeddingsSection() {
  const { t } = useTranslation();
  return (
    <SettingsCard section="embeddings" title={t('intel.settings.sections.embeddings')} subtitle={t('intel.settings.embeddings.subtitle')}>
      {({ value, saving, errorMessage, onSave }) => <EmbeddingsForm values={value} saving={saving} errorMessage={errorMessage} onSubmit={onSave} />}
    </SettingsCard>
  );
}
