import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, YStack } from 'tamagui';

import { useStatusUpload } from '@/hooks/useStatusUpload';

/** Floating "+" on the Explore feed that opens the create-post flow (pick + upload),
 * the same path as the profile's add-post (explore item 9). */
export function ExploreCreateButton() {
  const insets = useSafeAreaInsets();
  const { uploading, pickAndUpload } = useStatusUpload();

  return (
    <YStack
      testID="explore-create-post"
      role="button"
      aria-label="Create post"
      onPress={() => void pickAndUpload()}
      position="absolute"
      top={insets.top + 12}
      right={14}
      width={44}
      height={44}
      borderRadius={22}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$primary"
      shadowColor="#000000"
      shadowOpacity={0.3}
      shadowRadius={8}
      shadowOffset={{ width: 0, height: 3 }}
      pressStyle={{ opacity: 0.85 }}
    >
      {uploading ? (
        <Spinner color="#ffffff" />
      ) : (
        <MaterialIcons name="add" size={26} color="#ffffff" />
      )}
    </YStack>
  );
}
