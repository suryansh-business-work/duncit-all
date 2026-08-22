import SosIcon from '@mui/icons-material/Sos';
import PodScopedPage from './PodScopedPage';
import SosContent from './SosContent';
import { useTranslation } from '../../i18n/useTranslation';

export default function SosPage() {
  const { t } = useTranslation();
  return (
    <PodScopedPage
      title="SOS"
      subtitle={t('mweb.supportHub.emergencyHelpAtYourLivePod')}
      icon={<SosIcon fontSize="small" />}
      gradient="linear-gradient(135deg, #f44336 0%, #ff7a59 100%)"
    >
      {(selected) => <SosContent selected={selected} />}
    </PodScopedPage>
  );
}
