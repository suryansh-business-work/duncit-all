import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { formatDateTime } from '@/utils/date-format';
import type { SupportPodOption } from '@/utils/support-pods';

export interface PodPickerProps {
  options: SupportPodOption[];
  selectedId: string;
  onChange: (podDocId: string) => void;
}

/**
 * Pod selector for the pod-scoped support tools — RN twin of mWeb's MUI `<Select>`
 * dropdown: a pressable field shows the chosen pod (title + start time) and taps
 * open an inline list of every joined pod (so the pod can be changed), not a
 * single fixed pill.
 */
export function PodPicker({ options, selectedId, onChange }: Readonly<PodPickerProps>) {
  const [open, setOpen] = useState(false);
  const { color: ink, muted } = useThemeColors();

  if (options.length === 0) {
    return (
      <YStack
        testID="pod-picker-empty"
        padding={14}
        borderRadius={14}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
      >
        <Text fontSize={13} color="$muted">
          You haven’t joined any pods yet. Join a pod to use live support.
        </Text>
      </YStack>
    );
  }

  const selected = options.find((o) => o.podDocId === selectedId);

  return (
    <YStack gap={6}>
      <XStack
        testID="pod-picker"
        role="button"
        aria-label="Pod"
        aria-expanded={open}
        onPress={() => setOpen((o) => !o)}
        alignItems="center"
        gap={8}
        minHeight={52}
        paddingHorizontal={12}
        paddingVertical={8}
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
      >
        <MaterialIcons name="event" size={18} color={muted} />
        {selected ? (
          <YStack flex={1}>
            <Text fontSize={14} fontWeight="800" color="$color" numberOfLines={1}>
              {selected.title}
            </Text>
            <Text fontSize={11} color="$muted">
              {formatDateTime(selected.startsAt)}
            </Text>
          </YStack>
        ) : (
          <Text flex={1} fontSize={14} color="$muted">
            Select a pod
          </Text>
        )}
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={20} color={ink} />
      </XStack>
      {open ? (
        <YStack
          testID="pod-picker-options"
          borderRadius={12}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
          overflow="hidden"
        >
          {options.map((option) => {
            const isSelected = option.podDocId === selectedId;
            return (
              <XStack
                key={option.podDocId}
                testID={`pod-option-${option.podDocId}`}
                role="button"
                aria-label={option.title}
                aria-pressed={isSelected}
                onPress={() => {
                  onChange(option.podDocId);
                  setOpen(false);
                }}
                paddingHorizontal={12}
                paddingVertical={10}
                backgroundColor={isSelected ? '$primary' : 'transparent'}
                pressStyle={{ opacity: 0.8 }}
              >
                <YStack flex={1}>
                  <Text
                    fontSize={14}
                    fontWeight={isSelected ? '800' : '600'}
                    color={isSelected ? '$onPrimary' : '$color'}
                    numberOfLines={1}
                  >
                    {option.title}
                  </Text>
                  <Text fontSize={11} color={isSelected ? '$onPrimary' : '$muted'}>
                    {formatDateTime(option.startsAt)}
                  </Text>
                </YStack>
              </XStack>
            );
          })}
        </YStack>
      ) : null}
    </YStack>
  );
}
