import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { DeletionRequestPanel } from './DeletionRequestPanel';
import { useTranslation } from '@/hooks/useTranslation';

/** Account security — change password + the de-emphasised deletion corner at
 * the bottom of Profile Settings. RN twin of mWeb's SecuritySection. */
export function SecuritySection() {
  const { t } = useTranslation();
  const { color } = useThemeColors();
  const [changeOpen, setChangeOpen] = useState(false);
  const [changedOpen, setChangedOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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

      <DeletionRequestPanel onDone={setNotice} />

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
        open={!!notice}
        title={t('mweb.account.deletion.pendingTitle')}
        message={notice ?? ''}
        confirmLabel={t('mweb.common.done')}
        cancelLabel={t('mweb.common.close')}
        onConfirm={() => setNotice(null)}
        onCancel={() => setNotice(null)}
        testID="deletion-notice-dialog"
      />
    </YStack>
  );
}
