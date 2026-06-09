import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { usePolicy } from '@/hooks/usePolicies';
import { useThemeColors } from '@/hooks/useThemeColors';
import { stripHtml } from '@/utils/html';

export interface BackoutConfirmDialogProps {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onViewTerms: () => void;
}

/** Backout confirmation sheet — renders the live "backout-terms" policy inline,
 * RN twin of mWeb's BackoutConfirmDialog. */
export function BackoutConfirmDialog({
  open,
  busy,
  onClose,
  onConfirm,
  onViewTerms,
}: BackoutConfirmDialogProps) {
  const { color, onPrimary } = useThemeColors();
  const { data, isLoading } = usePolicy(open ? 'backout-terms' : '');
  const terms = stripHtml(data?.policyBySlug?.content);

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={busy ? undefined : onClose}
    >
      <ModalThemeScope>
        <YStack flex={1} testID="backout-dialog">
          <YStack
            role="button"
            aria-label="Close"
            onPress={busy ? undefined : onClose}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <YStack
            position="absolute"
            left={0}
            right={0}
            bottom={0}
            maxHeight="86%"
            backgroundColor="$background"
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
          >
            <SafeAreaView edges={['bottom']}>
              <XStack alignItems="center" justifyContent="space-between" padding={16}>
                <Text fontSize={18} fontWeight="900" color="$color">
                  Backout from this pod?
                </Text>
                <XStack
                  testID="backout-close"
                  role="button"
                  aria-label="Close"
                  onPress={busy ? undefined : onClose}
                  width={32}
                  height={32}
                  alignItems="center"
                  justifyContent="center"
                >
                  <MaterialIcons name="close" size={20} color={color} />
                </XStack>
              </XStack>

              <ScrollView
                style={{ maxHeight: 320 }}
                contentContainerStyle={{ paddingHorizontal: 16 }}
              >
                {isLoading ? (
                  <Spinner testID="backout-terms-loading" color="$primary" />
                ) : (
                  <Text fontSize={14} lineHeight={22} color="$color">
                    {terms || 'Review the backout terms before confirming.'}
                  </Text>
                )}
              </ScrollView>

              <XStack paddingHorizontal={16} paddingTop={8}>
                <Text
                  testID="backout-view-terms"
                  role="button"
                  aria-label="View backout terms"
                  onPress={onViewTerms}
                  fontSize={12}
                  fontWeight="800"
                  color="$primary"
                >
                  Read the full Backout Terms &amp; Conditions
                </Text>
              </XStack>

              <XStack padding={16} gap={12}>
                <XStack
                  testID="backout-cancel"
                  role="button"
                  aria-label="Cancel"
                  aria-disabled={busy}
                  onPress={busy ? undefined : onClose}
                  flex={1}
                  height={48}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={12}
                  borderWidth={1}
                  borderColor="$borderColor"
                  opacity={busy ? 0.6 : 1}
                  pressStyle={{ opacity: 0.85 }}
                >
                  <Text fontSize={14} fontWeight="800" color="$color">
                    Cancel
                  </Text>
                </XStack>
                <XStack
                  testID="backout-confirm"
                  role="button"
                  aria-label="Confirm backout"
                  aria-disabled={busy}
                  onPress={busy ? undefined : onConfirm}
                  flex={2}
                  height={48}
                  alignItems="center"
                  justifyContent="center"
                  gap={8}
                  borderRadius={12}
                  backgroundColor="$danger"
                  opacity={busy ? 0.7 : 1}
                  pressStyle={{ opacity: 0.85 }}
                >
                  {busy ? <Spinner size="small" color={onPrimary} /> : null}
                  <Text fontSize={14} fontWeight="900" color={onPrimary}>
                    {busy ? 'Backing out…' : 'Confirm Backout'}
                  </Text>
                </XStack>
              </XStack>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
