import { useTranslation } from '@duncit/app-settings';
import SettingsCard from '../SettingsCard';
import MediaForm from './media.form';

export { default as MediaForm } from './media.form';
export { makeMediaSchema, SUPPORTED_TYPES } from './media.types';

/** Settings › Media & Uploads. */
export default function MediaSection() {
  const { t } = useTranslation();
  return (
    <SettingsCard section="media" title={t('intel.settings.sections.media')} subtitle={t('intel.settings.media.subtitle')}>
      {({ value, saving, errorMessage, onSave }) => <MediaForm values={value} saving={saving} errorMessage={errorMessage} onSubmit={onSave} />}
    </SettingsCard>
  );
}
