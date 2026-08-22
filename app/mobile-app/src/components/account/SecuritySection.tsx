import type { Translate } from '@/i18n/fallback';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MobileRequestAccountDeletionOtpDocument } from '@/graphql/account';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useLogout } from '@/hooks/useLogout';
import { graphqlRequest } from '@/services/graphql.client';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { useTranslation } from '@/hooks/useTranslation';

const errMsg = (e: unknown, t: Translate) =>
  e instanceof Error ? e.message : t('mweb.account.somethingWentWrong');

/** Account security — change password + the de-emphasised, danger-styled delete
 * action at the bottom of Profile Settings. RN twin of mWeb's SecuritySection. */
export function SecuritySection() {
  const { t } = useTranslation();
  const { color, danger } = useThemeColors();
  const logout = useLogout();
  const [changeOpen, setChangeOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [changedOpen, setChangedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const confirmDeletion = () => {
    setRequesting(true);
    setError(null);
    graphqlRequest(MobileRequestAccountDeletionOtpDocument, undefined, { auth: true })
      .then(() => {
        setConfirmOpen(false);
        setDeleteOpen(true);
      })
      .catch((e) => setError(errMsg(e, t)))
      .finally(() => setRequesting(false));
  };

  return (
    <YStack
      testID="security-section"
      borderRadius={18}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      padding={16}
      gap={14}
    >
      <XStack alignItems="center" gap={12}>
        <MaterialIcons name="lock-reset" size={20} color={color} />
        <YStack flex={1}>
          <Text fontSize={14.5} fontWeight="700" color="$color">
            Password
          </Text>
          <Text fontSize={12.5} fontWeight="700" color="$muted">
            Change your password with an email verification code.
          </Text>
        </YStack>
        <Text
          testID="open-change-password"
          role="button"
          aria-label={t('mweb.account.changePassword')}
          onPress={() => setChangeOpen(true)}
          fontSize={13}
          fontWeight="700"
          color="$primary"
        >
          Change
        </Text>
      </XStack>

      <YStack height={1} backgroundColor="$borderColor" />

      <XStack
        testID="open-delete-account"
        role="button"
        aria-label={t('mweb.account.deleteAccount')}
        onPress={() => setConfirmOpen(true)}
        alignItems="center"
        gap={10}
        pressStyle={{ opacity: 0.7 }}
      >
        <MaterialIcons name="delete-forever" size={18} color={danger} />
        <Text fontSize={13.5} fontWeight="600" color="$danger">
          Delete account
        </Text>
      </XStack>
      {error ? (
        <Text fontSize={12.5} color="$danger" testID="security-section-error">
          {error}
        </Text>
      ) : null}

      <ChangePasswordDialog
        open={changeOpen}
        onClose={() => setChangeOpen(false)}
        onChanged={() => setChangedOpen(true)}
      />

      <ConfirmDialog
        open={changedOpen}
        title={t('mweb.account.passwordUpdated')}
        message={t('mweb.account.yourPasswordHasBeenChangedSuccessfully')}
        confirmLabel={t('mweb.common.done')}
        cancelLabel={t('mweb.common.close')}
        onConfirm={() => setChangedOpen(false)}
        onCancel={() => setChangedOpen(false)}
        testID="password-changed-dialog"
      />

      <ConfirmDialog
        open={confirmOpen}
        title={t('mweb.account.deleteYourAccount')}
        message={t('mweb.account.thisPermanentlyDeletesYourAccountAnd')}
        confirmLabel={requesting ? 'Sending…' : 'Send code'}
        cancelLabel={t('mweb.common.cancel')}
        destructive
        onConfirm={confirmDeletion}
        onCancel={() => setConfirmOpen(false)}
      />

      <DeleteAccountDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => void logout()}
      />
    </YStack>
  );
}
