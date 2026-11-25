import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { Text, YStack } from 'tamagui';

import { StateView } from '@/components/StateView';
import { TabBar } from '@/components/TabBar';
import { useEmailSettings } from '@/features/email-templates/useEmailSettings';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import type { EmailSettingsTab } from './routes';
import { BrandAssetsPanel } from './settings/BrandAssetsPanel';
import { PromptsPanel } from './settings/PromptsPanel';
import { ThemePanel } from './settings/ThemePanel';

/** CRM › Email Templates › Settings: the brand images, theme and AI instructions every CRM email uses. */
export function EmailTemplateSettingsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { params } = useRoute<RouteProp<AppStackParamList, 'EmailTemplateSettings'>>();
  const [tab, setTab] = useState<string>(params?.tab ?? 'assets');
  const brand = useEmailSettings();
  const { settings } = brand;

  useEffect(() => {
    navigation.setOptions({ title: t('crm.emailSettings.title') });
  }, [navigation, t]);

  const tabs: { key: EmailSettingsTab; label: string }[] = [
    { key: 'assets', label: t('crm.emailSettings.tabAssets') },
    { key: 'theme', label: t('crm.emailSettings.tabTheme') },
    { key: 'prompts', label: t('crm.emailSettings.tabPrompts') },
  ];

  const body = () => {
    if (tab === 'prompts') return <PromptsPanel />;
    if (!settings)
      return <StateView loading={brand.loading} error={brand.error} onRetry={brand.refetch} />;
    if (tab === 'theme') return <ThemePanel settings={settings} onSaved={brand.setSettings} />;
    return <BrandAssetsPanel settings={settings} brand={brand} />;
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text color="$muted">{t('crm.emailSettings.subtitle')}</Text>
        <TabBar tabs={tabs} active={tab} onChange={setTab} testID="email-settings-tab" />
        {body()}
      </ScrollView>
    </YStack>
  );
}
