import { useTranslation } from '@duncit/app-settings';
import SettingsCard from '../SettingsCard';
import GeneralForm from './general.form';

export { default as GeneralForm } from './general.form';
export { makeGeneralSchema } from './general.types';

/** Settings › General. Theme (light/dark) is each person's own choice, in the header. */
export default function GeneralSection() {
  const { t } = useTranslation();
  return (
    <SettingsCard section="general" title={t('intel.settings.sections.general')} subtitle={t('intel.settings.general.subtitle')}>
      {({ value, saving, errorMessage, onSave }) => <GeneralForm values={value} saving={saving} errorMessage={errorMessage} onSubmit={onSave} />}
    </SettingsCard>
  );
}
