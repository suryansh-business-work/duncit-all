import { Text, View, XStack } from 'tamagui';
import { auth } from '@duncit/auth-tokens';

/**
 * The overlapping-avatars social-proof strip from mWeb's login card. Avatar
 * colours + ring come from the shared auth tokens; the caption is passed in so
 * the marketing copy stays data-driven.
 */
export function AuthAvatarsStrip({ caption }: { caption: string }) {
  return (
    <XStack
      testID="auth-avatars-strip"
      alignItems="center"
      gap={12}
      borderRadius={10}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      paddingHorizontal={12}
      paddingVertical={8}
    >
      <XStack>
        {auth.avatars.map((color, index) => (
          <View
            key={color}
            width={22}
            height={22}
            borderRadius={11}
            backgroundColor={color}
            borderWidth={2}
            borderColor={auth.avatarRing}
            marginLeft={index === 0 ? 0 : -7}
          />
        ))}
      </XStack>
      <Text flex={1} fontSize={12} fontWeight="800" color="$color">
        {caption}
      </Text>
    </XStack>
  );
}
