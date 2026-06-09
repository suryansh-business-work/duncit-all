import { Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import type { StatusGroup } from '@/hooks/useStatus';

interface StatusViewerProps {
  status: StatusGroup | null;
  onClose: () => void;
}

/** Full-screen status viewer — RN port of mWeb's HomeStatusViewer. Opens when a
 * status tile is tapped; tap anywhere or the close button to dismiss. */
export function StatusViewer({ status, onClose }: Readonly<StatusViewerProps>) {
  return (
    <Modal visible={!!status} transparent animationType="fade" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack
          testID="status-viewer"
          flex={1}
          backgroundColor="rgba(0,0,0,0.94)"
          onPress={onClose}
        >
          <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
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
            <YStack flex={1} alignItems="center" justifyContent="center" paddingHorizontal={12}>
              {status?.latest.image_url ? (
                <Image
                  testID="status-viewer-image"
                  source={{ uri: status.latest.image_url }}
                  style={{ width: '100%', height: '80%', borderRadius: 16 }}
                  resizeMode="contain"
                />
              ) : null}
            </YStack>
            {status?.latest.caption ? (
              <Text color="#ffffff" fontSize={14} textAlign="center" padding={16}>
                {status.latest.caption}
              </Text>
            ) : null}
          </SafeAreaView>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
