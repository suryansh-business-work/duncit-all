import { Text, XStack, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** "Your profile is incomplete" nudge — RN port of mWeb's <IncompleteBanner/>.
 * Shown when profile completion < 100%; the green pill opens Account. */
export function SidebarIncompleteBanner({
  percent,
  onComplete,
}: Readonly<{ percent: number; onComplete: () => void }>) {
  const { t } = useTranslation();
  return (
    <YStack paddingHorizontal={16} paddingBottom={12}>
      <SurfaceCard
        testID="profile-completion"
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        gap={12}
        paddingVertical={12}
      >
        <XStack flex={1} alignItems="center" gap={10}>
          <YStack width={8} height={8} borderRadius={4} backgroundColor="$accent" />
          <YStack flex={1}>
            <Text numberOfLines={1} fontSize={14} fontWeight="600" color="$color">
              Your profile is incomplete
            </Text>
            <Text fontSize={12} color="$muted">
              {percent}% complete
            </Text>
          </YStack>
        </XStack>
        <XStack
          testID="profile-completion-cta"
          role="button"
          aria-label={t('mweb.sidebar.completeYourProfile')}
          onPress={onComplete}
          height={36}
          alignItems="center"
          borderRadius={999}
          backgroundColor="$primary"
          paddingHorizontal={16}
          pressStyle={PRESS_STYLE.solid}
        >
          <Text fontSize={13} fontWeight="600" color="$onPrimary">
            Complete
          </Text>
        </XStack>
      </SurfaceCard>
    </YStack>
  );
}
