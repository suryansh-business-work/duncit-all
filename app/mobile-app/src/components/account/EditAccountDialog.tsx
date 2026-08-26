import { useCallback, useRef, useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { buildUsernameLabels, normalizeUsername } from '@duncit/utils';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import {
  AccountEditForm,
  toUpdateProfileInput,
  type AccountEditValues,
} from '@/forms/account-edit';
import type { AccountMe, UpdateProfileInput } from '@/hooks/useAccount';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

export interface EditAccountDialogProps {
  open: boolean;
  me: AccountMe | null;
  onClose: () => void;
  onSave: (input: UpdateProfileInput) => Promise<void>;
  /** Renames the @handle. Called first, and only when it actually changed. */
  onSaveUsername: (username: string) => Promise<void>;
  /**
   * Told when a contact detail is proved and stored.
   *
   * Email, phone and WhatsApp do NOT ride Save: each is its own verified
   * write behind a one-time code, so it has already landed by the time this
   * fires and the account behind the sheet is reloaded on it.
   */
  onContactChanged?: () => void;
}

/* istanbul ignore next -- placeholder ref value, replaced once the form mounts */
const NOOP = () => undefined;

/** Edit-profile bottom sheet hosting the RHF+Zod form — RN twin of mWeb's
 * <EditAccountDialog/>. */
export function EditAccountDialog({
  open,
  me,
  onClose,
  onSave,
  onSaveUsername,
  onContactChanged,
}: Readonly<EditAccountDialogProps>) {
  const { t } = useTranslation();
  const { color } = useThemeColors();
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
    // The handle goes FIRST and on its own mutation: it is the only field the
    // server can still refuse after the field said yes (somebody can take it in
    // the 400ms between the check and the tap), and a refusal there must leave
    // the rest of the profile untouched rather than half-written.
    const handle = normalizeUsername(values.username);
    const renaming = handle && handle !== normalizeUsername(me?.username);
    try {
      if (renaming) {
        // Reported in the app's own words: the server's refusal is an
        // English-only sentence, and the only thing the reader can act on is
        // "pick another one".
        const failed = await onSaveUsername(handle).then(
          () => false,
          () => true,
        );
        if (failed) {
          setErrorMessage(buildUsernameLabels(t).saveFailed);
          return;
        }
      }
      await onSave(toUpdateProfileInput(values));
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t('mweb.account.couldNotSaveProfile'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={requestClose}>
      <ModalThemeScope>
        <KeyboardScreen>
          <YStack flex={1} testID="edit-account-dialog">
            <YStack
              role="button"
              aria-label={t('mweb.common.close')}
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
              <SafeAreaView edges={['bottom']} style={SHEET_SAFE_AREA}>
                <XStack
                  alignItems="center"
                  justifyContent="space-between"
                  paddingHorizontal={16}
                  paddingTop={16}
                  paddingBottom={8}
                >
                  <Text fontSize={18} fontWeight="700" color="$color">
                    Edit profile
                  </Text>
                  <XStack
                    testID="edit-account-close"
                    role="button"
                    aria-label={t('mweb.common.close')}
                    onPress={requestClose}
                    width={32}
                    height={32}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <MaterialIcons name="close" size={20} color={color} />
                  </XStack>
                </XStack>
                <ScrollView keyboardShouldPersistTaps="handled" style={SHEET_SAFE_AREA}>
                  <YStack paddingHorizontal={16} paddingBottom={16}>
                    <AccountEditForm
                      me={me}
                      loading={loading}
                      errorMessage={errorMessage}
                      onSubmit={submit}
                      onDirtyChange={(dirty) => {
                        dirtyRef.current = dirty;
                      }}
                      onRegisterReset={(reset) => {
                        resetRef.current = reset;
                      }}
                      onContactChanged={onContactChanged}
                    />
                  </YStack>
                </ScrollView>
              </SafeAreaView>
            </YStack>
          </YStack>
          <ConfirmDialog
            open={confirmOpen}
            testID="edit-account-discard-confirm"
            title={t('mweb.account.discardUnsavedChanges')}
            message={t('mweb.account.youHaveUnsavedChangesClosingNow')}
            confirmLabel={t('mweb.common.discard')}
            cancelLabel={t('mweb.account.keepEditing')}
            destructive
            onConfirm={confirmDiscard}
            onCancel={() => setConfirmOpen(false)}
          />
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
