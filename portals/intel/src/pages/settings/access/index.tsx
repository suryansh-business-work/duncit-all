import { useTranslation } from '@duncit/app-settings';
import { useBootstrap } from '../../../components/IntelBootstrap';
import SettingsCard from '../SettingsCard';
import AccessForm from './access.form';

export { default as AccessForm } from './access.form';
export { makeAccessSchema } from './access.types';

/** Settings › Access & Permissions. Read-only for Admins; Super Admins change it. */
export default function AccessSection() {
  const { t } = useTranslation();
  const { data: boot } = useBootstrap();
  return (
    <SettingsCard section="access" title={t('intel.settings.sections.access')} subtitle={t('intel.settings.access.subtitle')}>
      {({ value, saving, errorMessage, onSave }) => <AccessForm values={value} saving={saving} disabled={!boot?.me.can_super} errorMessage={errorMessage} onSubmit={onSave} />}
    </SettingsCard>
  );
}
