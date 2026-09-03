import { Switch } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

export interface ToggleRowProps {
  label: string;
  /** What the switch changes, under the label — the twin of MUI's FormControlLabel caption. */
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  testID: string;
}

/**
 * A labelled on/off row — the Tamagui stand-in for MUI's `<Switch>` inside a
 * `FormControlLabel` (rule 27). Every settings-style toggle in the app renders
 * through this one row so the label weight, the hint and the switch colour
 * cannot drift between screens (rule 34).
 */
export function ToggleRow({
  label,
  hint,
  value,
  onChange,
  disabled = false,
  testID,
}: Readonly<ToggleRowProps>) {
  const { primary } = useThemeColors();
  return (
    <XStack testID={testID} alignItems="center" gap={12} opacity={disabled ? 0.5 : 1}>
      <YStack flex={1} gap={2}>
        <Text fontSize={14} fontWeight="600" color="$color">
          {label}
        </Text>
        {hint ? (
          <Text fontSize={12} color="$muted">
            {hint}
          </Text>
        ) : null}
      </YStack>
      <Switch
        testID={`${testID}-switch`}
        aria-label={label}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: primary }}
      />
    </XStack>
  );
}
