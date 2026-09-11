import { Text, YStack } from 'tamagui';

import { ActionRow, type ActionIconName } from '@/components/host-manage/ActionRow';

interface GatedActionRowProps {
  testID: string;
  icon: ActionIconName;
  label: string;
  tint: string;
  danger?: boolean;
  /** False shows the row inert with `reason` under it. */
  enabled: boolean;
  /** Why the row is inert — only rendered when it is. */
  reason: string;
  onPress: () => void;
}

/**
 * An action the pod's phase can close, with the line that says why underneath.
 *
 * A closed row is kept rather than removed on purpose: a host who reaches for
 * scanning, editing or cancelling a pod that has already run gets an answer
 * instead of hunting for an action that silently vanished. mWeb says the same
 * thing with a disabled MenuItem and its `secondary` text (rule 27).
 */
export function GatedActionRow({
  testID,
  icon,
  label,
  tint,
  danger,
  enabled,
  reason,
  onPress,
}: Readonly<GatedActionRowProps>) {
  return (
    <YStack>
      <ActionRow
        testID={testID}
        icon={icon}
        label={label}
        tint={tint}
        danger={danger}
        disabled={!enabled}
        onPress={onPress}
      />
      {enabled ? null : (
        <Text
          testID={`${testID}-why`}
          marginTop={-8}
          paddingLeft={48}
          paddingRight={16}
          paddingBottom={12}
          fontSize={12}
          color="$muted"
        >
          {reason}
        </Text>
      )}
    </YStack>
  );
}
