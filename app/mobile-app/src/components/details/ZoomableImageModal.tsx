import { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

/** Renders one image inside a WebView whose viewport permits pinch-zoom — the
 * browser supplies the pinch/zoom gesture natively (mirrors the MapEmbed/
 * StatusVideo WebView pattern), so no gesture wiring is needed. */
function zoomHtml(url: string): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=6, user-scalable=yes"/><style>html,body{margin:0;height:100%;background:#000;display:flex;align-items:center;justify-content:center}img{max-width:100%;max-height:100%;object-fit:contain}</style></head><body><img src="${url}" alt=""/></body></html>`;
}

/** Full-screen, pinch-to-zoom image viewer with prev/next paging (Task B item 1).
 * Opens whenever `index` is a number; `null` closes it. */
export function ZoomableImageModal({
  images,
  index,
  onClose,
}: Readonly<{ images: string[]; index: number | null; onClose: () => void }>) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (index != null) setCurrent(index);
  }, [index]);

  const url = images[current] ?? '';

  return (
    <Modal visible={index != null} transparent animationType="fade" onRequestClose={onClose}>
      <YStack flex={1} backgroundColor="#000000" testID="zoom-image-modal">
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          <XStack
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal={16}
            paddingVertical={8}
          >
            <Text color="#ffffff" fontSize={13} fontWeight="800">
              {images.length > 0 ? `${current + 1} / ${images.length}` : ''}
            </Text>
            <XStack
              testID="zoom-image-close"
              role="button"
              aria-label="Close image"
              onPress={onClose}
              width={36}
              height={36}
              alignItems="center"
              justifyContent="center"
              borderRadius={18}
              backgroundColor="rgba(255,255,255,0.16)"
            >
              <MaterialIcons name="close" size={20} color="#ffffff" />
            </XStack>
          </XStack>
          <WebView
            testID="zoom-image-web"
            key={url}
            originWhitelist={['*']}
            source={{ html: zoomHtml(url) }}
            style={{ flex: 1, backgroundColor: '#000000' }}
            scalesPageToFit
          />
          {images.length > 1 ? (
            <XStack
              alignItems="center"
              justifyContent="space-between"
              paddingHorizontal={16}
              paddingBottom={8}
            >
              <XStack
                testID="zoom-image-prev"
                role="button"
                aria-label="Previous image"
                onPress={() => setCurrent((value) => Math.max(0, value - 1))}
                paddingHorizontal={16}
                paddingVertical={10}
                borderRadius={999}
                backgroundColor="rgba(255,255,255,0.16)"
              >
                <MaterialIcons name="chevron-left" size={22} color="#ffffff" />
              </XStack>
              <XStack
                testID="zoom-image-next"
                role="button"
                aria-label="Next image"
                onPress={() => setCurrent((value) => Math.min(images.length - 1, value + 1))}
                paddingHorizontal={16}
                paddingVertical={10}
                borderRadius={999}
                backgroundColor="rgba(255,255,255,0.16)"
              >
                <MaterialIcons name="chevron-right" size={22} color="#ffffff" />
              </XStack>
            </XStack>
          ) : null}
        </SafeAreaView>
      </YStack>
    </Modal>
  );
}
