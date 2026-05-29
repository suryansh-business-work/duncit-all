import SosIcon from '@mui/icons-material/Sos';
import PodScopedPage from './PodScopedPage';
import SosContent from './SosContent';

export default function SosPage() {
  return (
    <PodScopedPage
      title="SOS"
      subtitle="Emergency help at your live pod"
      icon={<SosIcon fontSize="small" />}
      gradient="linear-gradient(135deg, #f44336 0%, #ff7a59 100%)"
    >
      {(selected) => <SosContent selected={selected} />}
    </PodScopedPage>
  );
}
