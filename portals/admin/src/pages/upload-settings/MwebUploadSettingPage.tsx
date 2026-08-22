import UploadSettingPage from './UploadSettingPage';
import { useTranslation } from '@duncit/shell';

/** Admin > Upload Settings > mWeb Upload Setting. */
export default function MwebUploadSettingPage() {
  const { t } = useTranslation();
  return (
    <UploadSettingPage
      surface="MWEB"
      title={t('admin.uploads.mwebTitle')}
      subtitle={t('admin.uploads.mwebHint')}
    />
  );
}
