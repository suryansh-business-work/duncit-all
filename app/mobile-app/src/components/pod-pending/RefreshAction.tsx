import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  refreshing: boolean;
  onPress: () => void;
}

/** The back-bar's refresh control. The venue answers outside the app, so this is
 * the host's way to ask again without leaving the screen — the pull-down does
 * the same thing. mWeb twin: PodPendingHeader's refresh button (rule 27). */
export function RefreshAction({ refreshing, onPress }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink, primary } = useThemeColors();

  return (
    <XStack
      testID="pod-pending-refresh"
      role="button"
      aria-label={t('mweb.podPending.refresh')}
      aria-disabled={refreshing}
      onPress={refreshing ? undefined : onPress}
      width={40}
      height={40}
      alignItems="center"
      justifyContent="center"
      borderRadius={20}
      pressStyle={PRESS_STYLE.row}
    >
      {refreshing ? (
        <Spinner size="small" color={primary} />
      ) : (
        <MaterialIcons name="refresh" size={22} color={ink} />
      )}
    </XStack>
  );
}
