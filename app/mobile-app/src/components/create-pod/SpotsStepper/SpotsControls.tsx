import { MaterialIcons } from '@expo/vector-icons';
import { Slider, XStack } from 'tamagui';

import { PRESS_STYLE } from '@duncit/buttons-native';

type IconName = keyof typeof MaterialIcons.glyphMap;

interface SpotsSliderProps {
  min: number;
  max: number;
  value: number;
  /** "Total spots" — computed once by the parent and passed down (rule 26g). */
  label: string;
  onChange: (next: number) => void;
}

/** Tamagui's slider bound to whole spots. Hoisted to module scope — a component
 * defined inside another remounts on every render (S6478). */
export function SpotsSlider({ min, max, value, label, onChange }: Readonly<SpotsSliderProps>) {
  return (
    <Slider
      testID="create-pod-spots-slider"
      min={min}
      max={max}
      step={1}
      value={[value]}
      onValueChange={([next]) => onChange(next ?? min)}
      aria-label={label}
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

export function StepButton({ testID, label, icon, onPress, color }: Readonly<StepButtonProps>) {
  return (
    <XStack
      testID={testID}
      tabIndex={0}
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
      pressStyle={PRESS_STYLE.inline}
    >
      <MaterialIcons name={icon} size={18} color={color} />
    </XStack>
  );
}
