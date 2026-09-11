import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { REEL_SCRIM } from '@/components/explore/ExploreActionButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  podId: string;
  expired: boolean;
  /** "₹199 · Confirm with UPI" / "Free spot" — the one line a live pod shows. */
  subtitle: string;
  bottom: number;
  onGo: () => void;
}

/**
 * The pill pinned above the floating nav on every reel: the price line and a
 * green Go, or — for a pod that has already run — the expired notice with no
 * CTA. mWeb twin: explore-page/ExploreJoinBar.
 */
export function ExploreJoinBar({ podId, expired, subtitle, bottom, onGo }: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  return (
    <XStack
      position="absolute"
      left={12}
      right={12}
      bottom={bottom}
      alignItems="center"
      gap={10}
      padding={6}
      paddingRight={expired ? 16 : 6}
      borderRadius={999}
      backgroundColor={REEL_SCRIM}
      borderWidth={1}
      borderColor="rgba(255,255,255,0.12)"
    >
      <YStack
        width={40}
        height={40}
        borderRadius={20}
        backgroundColor="$accent"
        alignItems="center"
        justifyContent="center"
      >
        <MaterialIcons name={expired ? 'info-outline' : 'bolt'} size={20} color={onPrimary} />
      </YStack>
      {expired ? (
        <YStack flex={1}>
          <Text color="$onPrimary" fontSize={14} fontWeight="600" numberOfLines={1}>
            {t('mweb.explore.thisPodIsExpired')}
          </Text>
          <Text color="$onPrimary" opacity={0.82} fontSize={12} numberOfLines={1}>
            {t('mweb.explore.youCanStillViewThePodDetails')}
          </Text>
        </YStack>
      ) : (
        <>
          <Text flex={1} color="$onPrimary" fontSize={14} fontWeight="600" numberOfLines={1}>
            {subtitle}
          </Text>
          <XStack
            testID={`reel-go-${podId}`}
            role="button"
            aria-label={t('mweb.common.openPod')}
            onPress={onGo}
            alignItems="center"
            gap={4}
            height={40}
            paddingHorizontal={16}
            borderRadius={999}
            backgroundColor="$primary"
            pressStyle={PRESS_STYLE.solid}
          >
            <Text color="$onPrimary" fontSize={14} fontWeight="600">
              Go
            </Text>
            <MaterialIcons name="arrow-forward" size={16} color={onPrimary} />
          </XStack>
        </>
      )}
    </XStack>
  );
}
