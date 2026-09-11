import { Text, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { appVersion } from '@/utils/app-version';
import { useTranslation } from '@/hooks/useTranslation';
import { SidebarRow } from './SidebarRow';

/** Logout row (danger) + app version — RN port of mWeb's <DrawerFooter/>. */
export function SidebarFooter({ onLogout }: Readonly<{ onLogout: () => void }>) {
  const { t } = useTranslation();
  const version = appVersion();
  return (
    <YStack paddingHorizontal={16} paddingTop={4} paddingBottom={12} gap={8}>
      <SurfaceCard padding={0} overflow="hidden">
        <SidebarRow
          testID="sidebar-logout"
          icon="logout"
          label={t('mweb.common.logout')}
          tone="danger"
          chevron={false}
          onPress={onLogout}
        />
      </SurfaceCard>
      <Text testID="sidebar-app-version" fontSize={12} color="$muted" textAlign="center">
        App version {version}
      </Text>
    </YStack>
  );
}
