import { useEffect, useRef, useState } from 'react';
import { Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { StatusVideo } from '@/components/status/StatusVideo';
import type { StatusGroup } from '@/hooks/useStatus';

interface StatusViewerProps {
  status: StatusGroup | null;
  onClose: () => void;
}

// Each image slide runs 15s; videos play to their end, capped at 30s so a long
// clip can't hold the story open.
const IMAGE_DURATION_MS = 15000;
const VIDEO_CAP_MS = 30000;
const TICK_MS = 100;

/* istanbul ignore next -- placeholder ref value, replaced on the first render */
const NOOP = () => undefined;

/** Full-screen story viewer — multi-slide, auto-advancing (15s per image, video
 * to its end), with tap zones for manual prev/next and a close button. */
export function StatusViewer({ status, onClose }: Readonly<StatusViewerProps>) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const slides = status?.slides ?? [];
  const current = slides[index];
  const isVideo = current?.mediaType === 'VIDEO';

  const advanceRef = useRef(NOOP);
  advanceRef.current = () => {
    if (index < slides.length - 1) {
      setIndex(index + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  // Reset to the first slide whenever a new author's story opens.
  useEffect(() => {
    setIndex(0);
    setProgress(0);
  }, [status]);

  useEffect(() => {
    if (!status || !current) return undefined;
    const duration = isVideo ? VIDEO_CAP_MS : IMAGE_DURATION_MS;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const ratio = Math.min(1, (Date.now() - startedAt) / duration);
      setProgress(ratio);
      if (ratio >= 1) advanceRef.current();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [status, index, isVideo, current]);

  const goPrev = () => {
    if (index > 0) {
      setIndex(index - 1);
      setProgress(0);
    }
  };

  return (
    <Modal visible={!!status} transparent animationType="fade" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack testID="status-viewer" flex={1} backgroundColor="rgba(0,0,0,0.94)">
          <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
            <XStack gap={4} paddingHorizontal={12} paddingTop={8}>
              {slides.map((slide, slideIndex) => {
                let fill = 0;
                if (slideIndex < index) fill = 1;
                else if (slideIndex === index) fill = progress;
                return (
                  <YStack
                    key={slide.id}
                    flex={1}
                    height={3}
                    borderRadius={999}
                    backgroundColor="rgba(255,255,255,0.3)"
                    overflow="hidden"
                  >
                    <YStack height={3} width={`${fill * 100}%`} backgroundColor="#ffffff" />
                  </YStack>
                );
              })}
            </XStack>
            <XStack alignItems="center" justifyContent="space-between" padding={16}>
              <Text color="#ffffff" fontSize={16} fontWeight="900" numberOfLines={1} flex={1}>
                {status?.name ?? ''}
              </Text>
              <XStack
                testID="status-viewer-close"
                role="button"
                aria-label="Close status"
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
            <YStack flex={1}>
              {isVideo && current?.imageUrl ? (
                <StatusVideo uri={current.imageUrl} onEnded={() => advanceRef.current()} />
              ) : null}
              {!isVideo && current?.imageUrl ? (
                <Image
                  testID="status-viewer-image"
                  source={{ uri: current.imageUrl }}
                  style={{ flex: 1, width: '100%' }}
                  resizeMode="contain"
                />
              ) : null}
              <XStack position="absolute" top={0} bottom={0} left={0} right={0}>
                <YStack testID="status-prev" width="30%" onPress={goPrev} />
                <YStack flex={1} testID="status-next" onPress={() => advanceRef.current()} />
              </XStack>
            </YStack>
            {current?.caption ? (
              <Text color="#ffffff" fontSize={14} textAlign="center" padding={16}>
                {current.caption}
              </Text>
            ) : null}
          </SafeAreaView>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
