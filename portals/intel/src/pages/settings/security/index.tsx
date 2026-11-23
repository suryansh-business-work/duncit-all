import { useTranslation } from '@duncit/app-settings';
import { useBootstrap } from '../../../components/IntelBootstrap';
import SettingsCard from '../SettingsCard';
import SecurityForm from './security.form';

export { default as SecurityForm } from './security.form';
export { makeSecuritySchema, splitHosts } from './security.types';

/** Settings › Security. Read-only for Admins; Super Admins change it. */
export default function SecuritySection() {
  const { t } = useTranslation();
  const { data: boot } = useBootstrap();
  return (
    <SettingsCard section="security" title={t('intel.settings.sections.security')} subtitle={t('intel.settings.security.subtitle')}>
      {({ value, saving, errorMessage, onSave }) => (
        <SecurityForm values={{ ...value, mcp_allowed_hosts: value.mcp_allowed_hosts.join('\n') }} saving={saving} disabled={!boot?.me.can_super} errorMessage={errorMessage} onSubmit={onSave} />
      )}
    </SettingsCard>
  );
}
