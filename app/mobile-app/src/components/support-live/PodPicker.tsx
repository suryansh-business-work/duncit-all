import { ScrollView, Text, XStack, YStack } from 'tamagui';

import type { SupportPodOption } from '@/utils/support-pods';

export interface PodPickerProps {
  options: SupportPodOption[];
  selectedId: string;
  onChange: (podDocId: string) => void;
}

/** Horizontal pod selector for the pod-scoped support tools — RN twin of mWeb's
 * PodPicker. */
export function PodPicker({ options, selectedId, onChange }: Readonly<PodPickerProps>) {
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

  return (
    <ScrollView
      testID="pod-picker"
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {options.map((option) => {
        const selected = option.podDocId === selectedId;
        return (
          <XStack
            key={option.podDocId}
            testID={`pod-option-${option.podDocId}`}
            role="button"
            aria-label={option.title}
            aria-pressed={selected}
            onPress={() => onChange(option.podDocId)}
            paddingHorizontal={14}
            paddingVertical={9}
            borderRadius={999}
            backgroundColor={selected ? '$primary' : '$surface'}
            borderWidth={1}
            borderColor={selected ? '$primary' : '$borderColor'}
            pressStyle={{ opacity: 0.85 }}
          >
            <Text
              fontSize={13}
              fontWeight="800"
              color={selected ? '$onPrimary' : '$color'}
              numberOfLines={1}
            >
              {option.title}
            </Text>
          </XStack>
        );
      })}
    </ScrollView>
  );
}
