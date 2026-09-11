import { Text, Theme, XStack, YStack } from 'tamagui';

import { fileDetailChips, type MediaDetails } from './format';

interface Props {
  media: MediaDetails;
}

/** Full upload details for the upload dialog — file name plus type / size /
 * resolution (and duration for video) chips, for both images and videos.
 * It only ever sits on the crop dialog's black canvas, so it reads the DARK
 * theme's tokens in either app mode — the light ink would vanish there. */
export function FileDetails({ media }: Readonly<Props>) {
  const chips = fileDetailChips(media);
  return (
    <Theme name="dark">
      <YStack gap={8} width="100%" testID="file-details">
        <Text
          testID="file-details-name"
          fontSize={14}
          fontWeight="600"
          color="$color"
          numberOfLines={1}
        >
          {media.fileName}
        </Text>
        <XStack gap={6} flexWrap="wrap">
          {chips.map((chip) => (
            <XStack
              key={chip}
              alignItems="center"
              height={28}
              paddingHorizontal={10}
              borderRadius={999}
              backgroundColor="$soft"
            >
              <Text fontSize={12} fontWeight="500" color="$muted">
                {chip}
              </Text>
            </XStack>
          ))}
        </XStack>
      </YStack>
    </Theme>
  );
}
