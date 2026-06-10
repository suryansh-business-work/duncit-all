import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import PodScopedPage from './PodScopedPage';
import CallbackContent from './CallbackContent';

export default function CallbackPage() {
  return (
    <PodScopedPage
      title="Callback Request"
      subtitle="Call us or get a callback"
      icon={<PhoneCallbackIcon fontSize="small" />}
      gradient="linear-gradient(135deg, #2196f3 0%, #21cbf3 100%)"
    >
      {(selected) => <CallbackContent selected={selected} />}
    </PodScopedPage>
  );
}
