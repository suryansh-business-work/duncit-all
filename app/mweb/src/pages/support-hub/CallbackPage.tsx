import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import SupportShell from './SupportShell';
import CallbackContent from './CallbackContent';
import { useTranslation } from '../../i18n/useTranslation';

// Callback requests are not tied to a pod — no pod picker here (the team calls
// the user back about anything).
export default function CallbackPage() {
  const { t } = useTranslation();
  return (
    <SupportShell
      title={t('mweb.common.callbackRequest')}
      subtitle={t('mweb.supportHub.callUsOrGetACallback')}
      icon={<PhoneCallbackIcon fontSize="small" />}
      gradient="linear-gradient(135deg, #2196f3 0%, #21cbf3 100%)"
      backTo="/support"
    >
      <CallbackContent selected={null} />
    </SupportShell>
  );
}
