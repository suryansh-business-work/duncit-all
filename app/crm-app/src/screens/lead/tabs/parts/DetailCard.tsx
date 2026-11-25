import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

export type IconName = keyof typeof MaterialIcons.glyphMap;

interface Props {
  title: string;
  subtitle?: string;
  icon?: IconName;
  /** A control at the right of the header (e.g. Record evidence). */
  action?: ReactNode;
  children: ReactNode;
  testID?: string;
}

/** The portal's LeadDetailCard: an accent icon, a title and an optional caption above the rows. */
export function DetailCard({ title, subtitle, icon, action, children, testID }: Readonly<Props>) {
  const theme = useTheme();
  return (
    <YStack
      backgroundColor="$surface"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$borderColor"
      padding="$4"
      gap="$2"
      testID={testID}
    >
      <XStack alignItems="center" gap="$2">
        {icon ? (
          <MaterialIcons
            name={icon}
            size={22}
            color={theme.accentText?.val}
            accessibilityElementsHidden
          />
        ) : null}
        <YStack flex={1}>
          <Text fontWeight="800" fontSize="$5" role="heading">
            {title}
          </Text>
          {subtitle ? (
            <Text color="$muted" fontSize="$2">
              {subtitle}
            </Text>
          ) : null}
        </YStack>
        {action}
      </XStack>
      {children}
    </YStack>
  );
}
