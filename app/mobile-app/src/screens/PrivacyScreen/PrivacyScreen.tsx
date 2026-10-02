import { ScrollView } from 'react-native';

import { StackScreen } from '@/components/StackScreen';
import { useTranslation } from '@/hooks/useTranslation';
import { DataExportCard } from './DataExportCard';
import { TrackingChoicesCard } from './TrackingChoicesCard';

/**
 * Profile Settings → Privacy & data: tracking choices and a copy of your data.
 * RN twin of mWeb's PrivacyPage (rule 27).
 */
export function PrivacyScreen() {
  const { t } = useTranslation();
  return (
    <StackScreen title={t('privacy.page.title')} testID="privacy-page">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <TrackingChoicesCard />
        <DataExportCard />
      </ScrollView>
    </StackScreen>
  );
}
