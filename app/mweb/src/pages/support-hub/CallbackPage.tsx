import SupportShell from './SupportShell';
import CallbackContent from './CallbackContent';
import { useTranslation } from '../../i18n/useTranslation';

// Callback requests are not tied to a pod — no pod picker here (the team calls
// the user back about anything).
export default function CallbackPage() {
  const { t } = useTranslation();
  return (
    <SupportShell title={t('mweb.common.callbackRequest')} backTo="/support">
      <CallbackContent selected={null} />
    </SupportShell>
  );
}
