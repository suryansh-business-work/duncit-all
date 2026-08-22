import UploadSettingPage from './UploadSettingPage';
import { useTranslation } from '@duncit/shell';

/** Admin > Upload Settings > Mobile App. */
export default function MobileUploadSettingPage() {
  const { t } = useTranslation();
  return (
    <UploadSettingPage
      surface="MOBILE"
      title={t('admin.uploads.mobileTitle')}
      subtitle={t('admin.uploads.mobileHint')}
    />
  );
}
