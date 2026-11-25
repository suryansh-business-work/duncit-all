import { useLayoutEffect } from 'react';
import { Linking, ScrollView } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { config } from '@/constants/config';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';

/** The portal page's address in the CRM portal of the server this build uses. */
export const portalPageUrl = (path: string) => `${config.portalUrl}${path}`;

/**
 * A CRM portal page the app does not have yet, reached from the side menu. It
 * says so plainly — no placeholder pretending to be the page — and opens the
 * page in the portal, where the same account signs in.
 */
export function PortalPageScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<AppStackParamList, 'PortalPage'>>();
  const title = t(params.titleKey);

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const open = () =>
    fireAndForget(
      Linking.openURL(portalPageUrl(params.path)),
      logs.mobileApp,
      'crm-app/PortalPage',
      'openURL',
    );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card>
        <YStack alignItems="center" gap="$3" paddingVertical="$3">
          <MaterialIcons
            name="desktop-windows"
            size={48}
            color={theme.accentText?.val}
            accessibilityElementsHidden
          />
          <Text fontSize="$7" fontWeight="800" textAlign="center" role="heading">
            {title}
          </Text>
          <Text color="$muted" textAlign="center">
            {t('crmApp.portalPage.body', { vars: { page: title } })}
          </Text>
          <DuncitButton
            label={t('crmApp.portalPage.open')}
            onPress={open}
            icon={<MaterialIcons name="open-in-new" size={18} color={theme.onPrimary?.val} />}
            fullWidth
            testID="portal-page-open"
          />
          <Text color="$muted" fontSize="$2" textAlign="center" testID="portal-page-url">
            {portalPageUrl(params.path)}
          </Text>
        </YStack>
      </Card>
    </ScrollView>
  );
}
