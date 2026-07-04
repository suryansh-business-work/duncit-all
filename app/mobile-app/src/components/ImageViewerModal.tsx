import { FlatList, Modal, useWindowDimensions } from 'react-native';
import { AppImage } from '@/components/AppImage';

import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';

/** Full-screen, swipeable image viewer. Opened by tapping a details-hero image
 * so users can zoom into the full picture (contain-fit, dark backdrop). */
export function ImageViewerModal({
  images,
  index,
  onClose,
}: Readonly<{ images: string[]; index: number | null; onClose: () => void }>) {
  const { width, height } = useWindowDimensions();
  const visible = index !== null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack testID="image-viewer" flex={1} backgroundColor="rgba(0,0,0,0.96)">
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={index ?? 0}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(url, i) => `${i}-${url}`}
            renderItem={({ item }) => (
              <AppImage source={{ uri: item }} style={{ width, height }} resizeMode="contain" />
            )}
          />
          <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, right: 0 }}>
            <XStack
              testID="image-viewer-close"
              role="button"
              aria-label="Close image"
              onPress={onClose}
              margin={12}
              width={40}
              height={40}
              alignItems="center"
              justifyContent="center"
              borderRadius={20}
              backgroundColor="rgba(255,255,255,0.18)"
            >
              <MaterialIcons name="close" size={22} color="#ffffff" />
            </XStack>
          </SafeAreaView>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
