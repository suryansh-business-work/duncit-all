import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import type { UploadCropPreset } from '@/hooks/useUploadSettings';

interface ChipsProps {
  options: readonly UploadCropPreset[];
  selectedKey: string;
  suggestedKey: string | null;
  onSelect: (key: string) => void;
}

/** Selectable crop-aspect chips (No Crop + admin presets), with a "Suggested" tag. */
export function CropPresetChips({
  options,
  selectedKey,
  suggestedKey,
  onSelect,
}: Readonly<ChipsProps>) {
  return (
    <XStack gap={8} flexWrap="wrap" justifyContent="center">
      {options.map((preset) => {
        const selected = preset.key === selectedKey;
        const suffix = preset.key === suggestedKey ? ' · Suggested' : '';
        return (
          <XStack
            key={preset.key}
            testID={`crop-preset-${preset.key}`}
            role="button"
            aria-label={preset.label}
            // NOT aria-selected: that is invalid ARIA on role=button (S6811), and
            // swapping the role to "option" to satisfy it is an a11y regression —
            // React Native maps only "button" to Android's Button class +
            // setClickable and to iOS's UIAccessibilityTraits::Button, so an
            // "option" chip stops being announced as activatable on both
            // platforms. accessibilityState is RN's own channel for selection and
            // keeps the button semantics intact.
            accessibilityState={{ selected }}
            aria-pressed={selected}
            tabIndex={0}
            onPress={() => onSelect(preset.key)}
            paddingHorizontal={14}
            paddingVertical={9}
            borderRadius={999}
            borderWidth={1}
            borderColor={selected ? '$primary' : 'rgba(255,255,255,0.3)'}
            backgroundColor={selected ? '$primary' : 'transparent'}
            pressStyle={PRESS_STYLE.control}
          >
            <Text fontSize={13} fontWeight="600" color="#ffffff">
              {preset.label}
              {suffix}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}
