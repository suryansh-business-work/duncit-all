import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';

interface Props {
  urls: string[];
  max: number;
  onRemove: (url: string) => void;
}

/**
 * What has been picked so far, across both tabs — the Tamagui twin of the
 * package's SelectionTray (rule 27).
 *
 * Numbered, because the first image is the cover: a strip that only shows which
 * ones were chosen leaves "which one shows on the card?" unanswered.
 */
export function SelectionTray({ urls, max, onRemove }: Readonly<Props>) {
  return (
    <YStack gap={6} testID="cover-selection-tray">
      <XStack alignItems="center" gap={8}>
        <Text fontSize={12.5} fontWeight="700" color="$color">
          Selected
        </Text>
        <YStack
          paddingHorizontal={8}
          paddingVertical={2}
          borderRadius={999}
          backgroundColor={urls.length ? '$primary' : '$surface'}
        >
          <Text fontSize={11.5} fontWeight="700" color={urls.length ? '$onPrimary' : '$muted'}>
            {urls.length} of {max}
          </Text>
        </YStack>
        {urls.length > 0 ? (
          <Text fontSize={11.5} color="$muted">
            The first one is the cover.
          </Text>
        ) : null}
      </XStack>
      {urls.length === 0 ? (
        <Text fontSize={11.5} color="$muted">
          Pick up to {max} — from your phone, from Pexels, or both.
        </Text>
      ) : (
        <XStack gap={8} flexWrap="wrap">
          {urls.map((url, index) => (
            <YStack
              key={url}
              width={72}
              height={72}
              borderRadius={10}
              overflow="hidden"
              borderWidth={index === 0 ? 2 : 1}
              borderColor={index === 0 ? '$primary' : '$borderColor'}
              backgroundColor="$surface"
            >
              <AppImage source={{ uri: url }} style={{ width: 72, height: 72 }} />
              <YStack
                position="absolute"
                left={4}
                bottom={4}
                paddingHorizontal={5}
                borderRadius={6}
                backgroundColor="rgba(0,0,0,0.62)"
              >
                <Text fontSize={10.5} fontWeight="700" color="#ffffff">
                  {index + 1}
                </Text>
              </YStack>
              <XStack
                testID={`cover-tray-remove-${index}`}
                role="button"
                aria-label="Remove"
                onPress={() => onRemove(url)}
                position="absolute"
                top={2}
                right={2}
                width={20}
                height={20}
                alignItems="center"
                justifyContent="center"
                borderRadius={10}
                backgroundColor="rgba(0,0,0,0.55)"
                pressStyle={{ opacity: 0.8 }}
              >
                <MaterialIcons name="close" size={12} color="#ffffff" />
              </XStack>
            </YStack>
          ))}
        </XStack>
      )}
    </YStack>
  );
}
