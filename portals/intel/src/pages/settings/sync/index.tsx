import { useTranslation } from '@duncit/app-settings';
import SettingsCard from '../SettingsCard';
import SyncForm from './sync.form';

export { default as SyncForm } from './sync.form';
export { makeSyncSchema } from './sync.types';

/** Settings › Synchronization (runs and per-connector controls are on the Sync Dashboard). */
export default function SyncSection() {
  const { t } = useTranslation();
  return (
    <SettingsCard section="sync" title={t('intel.settings.sections.sync')} subtitle={t('intel.settings.sync.subtitle')}>
      {({ value, saving, errorMessage, onSave }) => <SyncForm values={value} saving={saving} errorMessage={errorMessage} onSubmit={onSave} />}
    </SettingsCard>
  );
}
