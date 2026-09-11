import { Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  enabled: boolean;
  onToggle: (next: boolean) => void;
}

/** The allow-notifications switch, in one calm card. mWeb twin:
 * notifications-screen/NotificationsHero. */
export function NotificationsHero({ enabled, onToggle }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted, primary } = useThemeColors();
  return (
    <SurfaceCard
      flexDirection="row"
      alignItems="center"
      gap={12}
      marginHorizontal={16}
      marginBottom={12}
      paddingVertical={10}
    >
      <MaterialIcons name="notifications-none" size={22} color={muted} />
      <Text flex={1} fontSize={14} fontWeight="600" color="$color">
        Allow notifications
      </Text>
      <Switch
        testID="notifications-allow-switch"
        aria-label={t('mweb.notifications.allowNotifications')}
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ true: primary }}
      />
    </SurfaceCard>
  );
}
