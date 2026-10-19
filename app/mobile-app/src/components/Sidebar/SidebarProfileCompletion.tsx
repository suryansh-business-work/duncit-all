import { Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** The completion nudge inside the profile card — "Your profile is N%
 * complete", a thin primary bar and the red Complete pill, which opens
 * Account. Shown while completion is under 100%. mWeb twin:
 * profile-drawer/ProfileCompletion. */
export function SidebarProfileCompletion({
  percent,
  onComplete,
}: Readonly<{ percent: number; onComplete: () => void }>) {
  const { t } = useTranslation();
  const label = t('mweb.sidebar.profileProgress', { vars: { pct: percent } });
  return (
    <XStack testID="profile-completion" alignItems="center" gap={12} paddingTop={14}>
      <YStack flex={1} minWidth={0} gap={8}>
        <Text numberOfLines={1} fontSize={13} fontWeight="600" color="$color">
          {label}
        </Text>
        <YStack
          testID="profile-completion-bar"
          height={4}
          borderRadius={999}
          backgroundColor="$primarySoft"
          overflow="hidden"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <YStack height={4} borderRadius={999} backgroundColor="$primary" width={`${percent}%`} />
        </YStack>
      </YStack>
      <XStack
        testID="profile-completion-cta"
        role="button"
        aria-label={t('mweb.sidebar.completeYourProfile')}
        tabIndex={0}
        // 32 drawn, 44 touchable.
        hitSlop={6}
        onPress={onComplete}
        height={32}
        alignItems="center"
        borderRadius={999}
        backgroundColor="$primary"
        paddingHorizontal={14}
        pressStyle={PRESS_STYLE.solid}
      >
        <Text fontSize={13} fontWeight="600" color="$onPrimary">
          {t('mweb.sidebar.complete')}
        </Text>
      </XStack>
    </XStack>
  );
}
