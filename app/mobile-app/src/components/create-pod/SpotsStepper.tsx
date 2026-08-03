import { MaterialIcons } from '@expo/vector-icons';
import { Input, Slider, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = keyof typeof MaterialIcons.glyphMap;

interface SpotsSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (next: number) => void;
}

/** Tamagui's slider bound to whole spots. Hoisted to module scope — a component
 * defined inside another remounts on every render (S6478). */
function SpotsSlider({ min, max, value, onChange }: Readonly<SpotsSliderProps>) {
  return (
    <Slider
      testID="create-pod-spots-slider"
      min={min}
      max={max}
      step={1}
      value={[value]}
      onValueChange={([next]) => onChange(next ?? min)}
      aria-label="Total spots"
    >
      <Slider.Track>
        <Slider.TrackActive />
      </Slider.Track>
      <Slider.Thumb index={0} circular size="$2" />
    </Slider>
  );
}

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
  /** True when there is a real range to pick from — render the slider. */
  slidable?: boolean;
  /** Shown under the slider: where the floor and the ceiling come from. */
  boundsHint?: string;
  /** When true, spots are fixed (no range to choose) — shown read-only. */
  readOnly?: boolean;
}

/**
 * Total-spots control. When the pod has a real range — the sub-category's
 * minimum up to the booked venue space's capacity — the host drags a slider
 * anywhere between the two. With no range to pick from it falls back to a fixed
 * number, and a virtual pod with no venue keeps the plain stepper.
 * Mobile twin of mWeb's SpotsStepper (rule 27).
 */
export function SpotsStepper({
  value,
  onChange,
  error,
  min = 0,
  max = 10000,
  slidable = false,
  boundsHint,
  readOnly = false,
}: Readonly<Props>) {
  const { color } = useThemeColors();
  const parsed = Number.parseInt(value, 10);
  const current = Number.isFinite(parsed) ? parsed : min;
  const set = (next: number) => onChange(String(Math.max(min, Math.min(max, next))));

  if (slidable) {
    return (
      <YStack gap={6}>
        <YStack
          gap={8}
          padding={14}
          borderRadius={14}
          borderWidth={1}
          borderColor={error ? '$danger' : '$borderColor'}
          backgroundColor="$surface"
        >
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize={14} fontWeight="700" color="$color">
              Total spots
            </Text>
            <Text testID="create-pod-spots-value" fontSize={20} fontWeight="700" color="$color">
              {current}
            </Text>
          </XStack>
          <SpotsSlider min={min} max={max} value={current} onChange={set} />
          <XStack justifyContent="space-between">
            <Text fontSize={11} color="$muted">
              {min}
            </Text>
            <Text fontSize={11} color="$muted">
              {max}
            </Text>
          </XStack>
          {boundsHint ? (
            <Text testID="create-pod-spots-bounds" fontSize={12} color="$muted">
              {boundsHint}
            </Text>
          ) : null}
        </YStack>
        {error ? (
          <Text testID="no_of_spots_text-error" fontSize={12} color="$danger">
            {error}
          </Text>
        ) : null}
      </YStack>
    );
  }

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
          <Text fontSize={14} fontWeight="700" color="$color">
            Total spots
          </Text>
          <Text fontSize={12} color="$muted">
            {readOnly ? 'Set by the venue space you picked.' : 'Number of available tickets.'}
          </Text>
        </YStack>
        {readOnly ? (
          <Text testID="create-pod-spots-readonly" fontSize={20} fontWeight="700" color="$color">
            {value}
          </Text>
        ) : (
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
              fontWeight="700"
              borderColor="$borderColor"
              keyboardType="numeric"
              value={value}
              // Digits only — spots are whole seats, and a fractional/garbage
              // value would feed a bogus collection into the earnings preview.
              onChangeText={(text) => onChange(text.replace(/\D/g, ''))}
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
        )}
      </XStack>
      {error ? (
        <Text testID="no_of_spots_text-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
