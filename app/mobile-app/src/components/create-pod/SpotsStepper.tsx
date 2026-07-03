import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = keyof typeof MaterialIcons.glyphMap;

interface StepButtonProps {
  testID: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  color: string;
}

function StepButton({ testID, label, icon, onPress, color }: Readonly<StepButtonProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      width={36}
      height={36}
      borderRadius={18}
      borderWidth={1}
      borderColor="$borderColor"
      alignItems="center"
      justifyContent="center"
      pressStyle={{ opacity: 0.6 }}
    >
      <MaterialIcons name={icon} size={18} color={color} />
    </XStack>
  );
}

interface Props {
  value: string;
  onChange: (next: string) => void;
  error?: string;
  min?: number;
  max?: number;
}

/** Total-spots stepper — decrement / editable count / increment, clamped to the
 * schema's 0–10000 range. Mobile twin of mWeb's SpotsStepper. */
export function SpotsStepper({ value, onChange, error, min = 0, max = 10000 }: Readonly<Props>) {
  const { color } = useThemeColors();
  const parsed = Number.parseInt(value, 10);
  const current = Number.isFinite(parsed) ? parsed : min;
  const set = (next: number) => onChange(String(Math.max(min, Math.min(max, next))));

  return (
    <YStack gap={6}>
      <XStack
        alignItems="center"
        justifyContent="space-between"
        padding={14}
        borderRadius={14}
        borderWidth={1}
        borderColor={error ? '$danger' : '$borderColor'}
        backgroundColor="$surface"
      >
        <YStack flex={1}>
          <Text fontSize={14} fontWeight="900" color="$color">
            Total spots
          </Text>
          <Text fontSize={12} color="$muted">
            Number of available tickets.
          </Text>
        </YStack>
        <XStack alignItems="center" gap={10}>
          <StepButton
            testID="spots-dec"
            label="Decrease spots"
            icon="remove"
            onPress={() => set(current - 1)}
            color={color}
          />
          <Input
            testID="field-no_of_spots_text"
            width={64}
            textAlign="center"
            size="$4"
            backgroundColor="$surface"
            color="$color"
            fontWeight="900"
            borderColor="$borderColor"
            keyboardType="numeric"
            value={value}
            onChangeText={onChange}
            aria-label="Total spots"
          />
          <StepButton
            testID="spots-inc"
            label="Increase spots"
            icon="add"
            onPress={() => set(current + 1)}
            color={color}
          />
        </XStack>
      </XStack>
      {error ? (
        <Text testID="no_of_spots_text-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
