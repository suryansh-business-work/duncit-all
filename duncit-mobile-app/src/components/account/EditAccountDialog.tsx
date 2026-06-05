import { useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import {
  AccountEditForm,
  toUpdateProfileInput,
  type AccountEditValues,
} from '@/forms/account-edit';
import type { AccountMe, UpdateProfileInput } from '@/hooks/useAccount';
import { useThemeColors } from '@/hooks/useThemeColors';

export interface EditAccountDialogProps {
  open: boolean;
  me: AccountMe | null;
  onClose: () => void;
  onSave: (input: UpdateProfileInput) => Promise<void>;
}

/** Edit-profile bottom sheet hosting the RHF+Zod form — RN twin of mWeb's
 * <EditAccountDialog/>. */
export function EditAccountDialog({ open, me, onClose, onSave }: EditAccountDialogProps) {
  const { color } = useThemeColors();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async (values: AccountEditValues) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await onSave(toUpdateProfileInput(values));
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} testID="edit-account-dialog">
          <YStack
            role="button"
            aria-label="Close"
            onPress={onClose}
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
            maxHeight="92%"
            backgroundColor="$background"
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
          >
            <SafeAreaView edges={['bottom']}>
              <XStack
                alignItems="center"
                justifyContent="space-between"
                paddingHorizontal={16}
                paddingTop={16}
                paddingBottom={8}
              >
                <Text fontSize={18} fontWeight="900" color="$color">
                  Edit profile
                </Text>
                <XStack
                  testID="edit-account-close"
                  role="button"
                  aria-label="Close"
                  onPress={onClose}
                  width={32}
                  height={32}
                  alignItems="center"
                  justifyContent="center"
                >
                  <MaterialIcons name="close" size={20} color={color} />
                </XStack>
              </XStack>
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 560 }}>
                <YStack paddingHorizontal={16} paddingBottom={16}>
                  <AccountEditForm
                    me={me}
                    loading={loading}
                    errorMessage={errorMessage}
                    onSubmit={submit}
                  />
                </YStack>
              </ScrollView>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
