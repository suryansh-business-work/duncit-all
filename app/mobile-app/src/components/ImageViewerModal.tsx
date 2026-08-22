import { FlatList, Modal, useWindowDimensions } from 'react-native';
import { AppImage } from '@/components/AppImage';

import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useTranslation } from '@/hooks/useTranslation';

/** A confirm button pinned over the bottom of the viewer — lets the viewer double
 * as a "look before you commit" step (the stock-photo picker previews a photo
 * here and only imports it once this is pressed). */
export interface ImageViewerAction {
  label: string;
  onPress: () => void;
  /** Shows a spinner and blocks repeat presses while the action runs. */
  busy?: boolean;
}

interface Props {
  images: string[];
  index: number | null;
  onClose: () => void;
  action?: ImageViewerAction;
  /** Small line above the action — e.g. the Pexels photographer credit. */
  caption?: string;
}

/** Full-screen, swipeable image viewer. Opened by tapping a details-hero image
 * so users can zoom into the full picture (contain-fit, dark backdrop). */
export function ImageViewerModal({ images, index, onClose, action, caption }: Readonly<Props>) {
  const { t } = useTranslation();
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
              aria-label={t('mweb.common.closeImage')}
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

          {action ? (
            <SafeAreaView
              edges={['bottom']}
              style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
            >
              <YStack padding={16} gap={10}>
                {caption ? (
                  <Text testID="image-viewer-caption" fontSize={12} color="rgba(255,255,255,0.75)">
                    {caption}
                  </Text>
                ) : null}
                <XStack
                  testID="image-viewer-action"
                  role="button"
                  aria-label={action.label}
                  aria-disabled={action.busy}
                  onPress={action.busy ? undefined : action.onPress}
                  height={48}
                  alignItems="center"
                  justifyContent="center"
                  gap={8}
                  borderRadius={12}
                  backgroundColor="$primary"
                  opacity={action.busy ? 0.7 : 1}
                  pressStyle={{ opacity: 0.85 }}
                >
                  {action.busy ? <Spinner color="$onPrimary" /> : null}
                  <Text fontSize={14} fontWeight="700" color="$onPrimary">
                    {action.label}
                  </Text>
                </XStack>
              </YStack>
            </SafeAreaView>
          ) : null}
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
