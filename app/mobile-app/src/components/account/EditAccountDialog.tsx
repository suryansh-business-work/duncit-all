import { useCallback, useMemo, useRef, useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import {
  AccountEditForm,
  toUpdateProfileInput,
  type AccountEditValues,
} from '@/forms/account-edit';
import { useLocations } from '@/hooks/useLocations';
import type { AccountMe, UpdateProfileInput } from '@/hooks/useAccount';
import { useThemeColors } from '@/hooks/useThemeColors';
import { buildLocationTree } from '@/utils/location-tree';

export interface EditAccountDialogProps {
  open: boolean;
  me: AccountMe | null;
  onClose: () => void;
  onSave: (input: UpdateProfileInput) => Promise<void>;
}

/* istanbul ignore next -- placeholder ref value, replaced once the form mounts */
const NOOP = () => undefined;

/** Edit-profile bottom sheet hosting the RHF+Zod form — RN twin of mWeb's
 * <EditAccountDialog/>. */
export function EditAccountDialog({ open, me, onClose, onSave }: Readonly<EditAccountDialogProps>) {
  const { color } = useThemeColors();
  const { locations } = useLocations();
  const countries = useMemo(() => buildLocationTree(locations), [locations]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const dirtyRef = useRef(false);
  const resetRef = useRef<() => void>(NOOP);

  const requestClose = useCallback(() => {
    if (dirtyRef.current) {
      setConfirmOpen(true);
      return;
    }
    onClose();
  }, [onClose]);

  const confirmDiscard = useCallback(() => {
    resetRef.current();
    setConfirmOpen(false);
    onClose();
  }, [onClose]);

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
    <Modal visible={open} transparent animationType="slide" onRequestClose={requestClose}>
      <ModalThemeScope>
        <YStack flex={1} testID="edit-account-dialog">
          <YStack
            role="button"
            aria-label="Close"
            onPress={requestClose}
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
                  onPress={requestClose}
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
                    countries={countries}
                    loading={loading}
                    errorMessage={errorMessage}
                    onSubmit={submit}
                    onDirtyChange={(dirty) => {
                      dirtyRef.current = dirty;
                    }}
                    onRegisterReset={(reset) => {
                      resetRef.current = reset;
                    }}
                  />
                </YStack>
              </ScrollView>
            </SafeAreaView>
          </YStack>
        </YStack>
        <ConfirmDialog
          open={confirmOpen}
          testID="edit-account-discard-confirm"
          title="Discard unsaved changes?"
          message="You have unsaved changes. Closing now will lose them."
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          destructive
          onConfirm={confirmDiscard}
          onCancel={() => setConfirmOpen(false)}
        />
      </ModalThemeScope>
    </Modal>
  );
}
