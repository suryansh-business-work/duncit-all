import type { MaterialIcons } from '@expo/vector-icons';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { Text, YStack, useTheme } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';

export type IconName = keyof typeof MaterialIcons.glyphMap;

interface Props {
  icon: IconName;
  title: string;
  body?: string;
  /** Tinted red for a failure, muted otherwise. */
  tone?: 'muted' | 'danger';
  action?: { label: string; onPress: () => void; testID?: string };
  testID?: string;
}

/** A screen or list with nothing to show: an icon, what happened, and what to do next. */
export function EmptyState({ icon, title, body, tone = 'muted', action, testID }: Readonly<Props>) {
  const theme = useTheme();
  const color = tone === 'danger' ? theme.danger?.val : theme.muted?.val;
  return (
    <YStack
      paddingVertical="$7"
      paddingHorizontal="$5"
      alignItems="center"
      gap="$2"
      testID={testID}
    >
      <YStack
        width={64}
        height={64}
        borderRadius={32}
        backgroundColor={tone === 'danger' ? '$dangerSoft' : '$soft'}
        alignItems="center"
        justifyContent="center"
        marginBottom="$2"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Icon name={icon} size={30} color={color} />
      </YStack>
      <Text
        fontWeight="700"
        fontSize="$5"
        textAlign="center"
        color={tone === 'danger' ? '$danger' : '$color'}
        // A failure is announced as soon as it shows; the retry under it stays its own button.
        role={tone === 'danger' ? 'alert' : undefined}
      >
        {title}
      </Text>
      {body ? (
        <Text color="$muted" textAlign="center">
          {body}
        </Text>
      ) : null}
      {action ? (
        <YStack marginTop="$3">
          <DuncitButton
            label={action.label}
            onPress={action.onPress}
            variant="outline"
            testID={action.testID}
          />
        </YStack>
      ) : null}
    </YStack>
  );
}
