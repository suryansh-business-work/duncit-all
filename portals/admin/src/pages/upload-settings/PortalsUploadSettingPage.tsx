import UploadSettingPage from './UploadSettingPage';
import { useTranslation } from '@duncit/shell';

/** Admin > Upload Settings > Portals Upload Setting. */
export default function PortalsUploadSettingPage() {
  const { t } = useTranslation();
  return (
    <UploadSettingPage
      surface="PORTALS"
      title={t('admin.uploads.portalsTitle')}
      subtitle={t('admin.uploads.portalsHint')}
    />
  );
}
