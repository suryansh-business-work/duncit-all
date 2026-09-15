import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Follow / Following pill used on pod + club details: the green pill to
 * follow, a soft pill once followed — matching the public-profile follow button. */
export function FollowPillButton({
  following,
  busy,
  onToggle,
  testID,
}: Readonly<{
  following: boolean;
  busy: boolean;
  onToggle: () => void;
  testID?: string;
}>) {
  const { onPrimary, color: ink } = useThemeColors();
  const { t } = useTranslation();
  // The name is the words on the pill (WCAG 2.5.3), exactly as mWeb's twin
  // names it — "Following" already says the follow exists.
  const label = following ? t('mweb.follow.following') : t('mweb.follow.follow');
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-disabled={busy}
      aria-busy={busy}
      tabIndex={0}
      onPress={busy ? undefined : onToggle}
      alignSelf="flex-start"
      alignItems="center"
      gap={8}
      height={44}
      paddingHorizontal={20}
      borderRadius={999}
      backgroundColor={following ? '$soft' : '$primary'}
      opacity={busy ? 0.7 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons
        name={following ? 'how-to-reg' : 'person-add-alt'}
        size={18}
        color={following ? ink : onPrimary}
      />
      <Text fontSize={14} fontWeight="600" color={following ? '$color' : '$onPrimary'}>
        {label}
      </Text>
    </XStack>
  );
}
