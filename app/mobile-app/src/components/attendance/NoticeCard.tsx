import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

export type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

type IconName = keyof typeof MaterialIcons.glyphMap;

/** The tonal ground each tone sits on. There is no warning tint, so a warning
 * sits on the neutral soft fill and carries its colour in the icon. */
const FILL = {
  info: '$primarySoft',
  success: '$successSoft',
  warning: '$soft',
  danger: '$dangerSoft',
} as const;

const ICON: Record<NoticeTone, IconName> = {
  info: 'info-outline',
  success: 'check-circle',
  warning: 'warning-amber',
  danger: 'error-outline',
};

interface Props {
  tone: NoticeTone;
  title: string;
  body?: string;
  /** Overrides the tone's default glyph (a clock for a deadline, a lock). */
  icon?: IconName;
  testID?: string;
}

/**
 * A calm notice — the Tamagui twin of the themed MUI `<Alert>` the shared
 * `@duncit/*` views render on mWeb (rule 27): a tonal fill, a hairline, 14px
 * corners and the icon in the notice's own colour.
 */
export function NoticeCard({ tone, title, body, icon, testID }: Readonly<Props>) {
  const colors = useThemeColors();
  const tint = {
    info: colors.primary,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  }[tone];

  return (
    <XStack
      testID={testID}
      gap={12}
      paddingVertical={12}
      paddingHorizontal={14}
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor={FILL[tone]}
    >
      <MaterialIcons name={icon ?? ICON[tone]} size={20} color={tint} />
      <YStack flex={1} gap={2}>
        <Text fontSize={14} fontWeight="600" color="$color">
          {title}
        </Text>
        {body ? (
          <Text fontSize={13} color="$muted" lineHeight={18}>
            {body}
          </Text>
        ) : null}
      </YStack>
    </XStack>
  );
}
