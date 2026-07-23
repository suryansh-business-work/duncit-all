import { Text, XStack, YStack } from 'tamagui';

import { fileDetailChips, type MediaDetails } from './format';

interface Props {
  media: MediaDetails;
}

/** Full upload details for the upload dialog — file name plus type / size /
 * resolution (and duration for video) chips, for both images and videos. */
export function FileDetails({ media }: Readonly<Props>) {
  const chips = fileDetailChips(media);
  return (
    <YStack gap={6} width="100%" testID="file-details">
      <Text
        testID="file-details-name"
        fontSize={13}
        fontWeight="800"
        color="$color"
        numberOfLines={1}
      >
        {media.fileName}
      </Text>
      <XStack gap={6} flexWrap="wrap">
        {chips.map((chip) => (
          <XStack
            key={chip}
            paddingHorizontal={8}
            paddingVertical={3}
            borderRadius={999}
            backgroundColor="$surface"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <Text fontSize={11} color="$muted">
              {chip}
            </Text>
          </XStack>
        ))}
      </XStack>
    </YStack>
  );
}
