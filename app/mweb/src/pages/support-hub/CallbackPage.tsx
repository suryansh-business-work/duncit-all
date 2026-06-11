import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import SupportShell from './SupportShell';
import CallbackContent from './CallbackContent';

// Callback requests are not tied to a pod — no pod picker here (the team calls
// the user back about anything).
export default function CallbackPage() {
  return (
    <SupportShell
      title="Callback Request"
      subtitle="Call us or get a callback"
      icon={<PhoneCallbackIcon fontSize="small" />}
      gradient="linear-gradient(135deg, #2196f3 0%, #21cbf3 100%)"
      backTo="/support"
    >
      <CallbackContent selected={null} />
    </SupportShell>
  );
}
