import { useCallback, useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MobileMyConnectedAccountsDocument } from '@/graphql/account';
import { useThemeColors } from '@/hooks/useThemeColors';
import { graphqlRequest } from '@/services/graphql.client';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { DeletionRequestPanel } from './DeletionRequestPanel';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** The one-shot notice shown after the password is set. */
interface DoneNotice {
  title: string;
  message: string;
}

/**
 * Account security — the account password + the de-emphasised deletion corner
 * at the bottom of Profile Settings.
 *
 * An account that signed up with Google has NO password, so this row offers to
 * CREATE one rather than change one it never had — and the sheet behind it never
 * asks for a current password there is none of. `has_password` is what decides,
 * straight off the server, because the hash is select:false and only the server
 * can see it. mWeb twin of SecuritySection.
 */
export function SecuritySection() {
  const { t } = useTranslation();
  const { color } = useThemeColors();
  const [changeOpen, setChangeOpen] = useState(false);
  const [done, setDone] = useState<DoneNotice | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(true);

  const load = useCallback(async () => {
    const data = await graphqlRequest(MobileMyConnectedAccountsDocument, undefined, {
      auth: true,
    });
    setHasPassword(!!data.myConnectedAccounts.has_password);
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const action = hasPassword ? t('mweb.account.changeAction') : t('mweb.account.createAction');
  const label = hasPassword ? t('mweb.account.changePassword') : t('mweb.account.createPassword');
  const hint = hasPassword
    ? t('mweb.account.changePasswordHint')
    : t('mweb.account.createPasswordHint');
  const doneMessage = hasPassword
    ? t('mweb.account.yourPasswordHasBeenChangedSuccessfully')
    : t('mweb.account.yourPasswordHasBeenCreatedSuccessfully');
  const doneTitle = hasPassword
    ? t('mweb.account.passwordUpdated')
    : t('mweb.account.passwordCreated');

  // The copy is frozen at the moment of the change: the reload right after it
  // flips hasPassword, and a notice still on screen must not rewrite itself.
  const handleChanged = () => {
    setDone({ title: doneTitle, message: doneMessage });
    load().catch(() => undefined);
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
            {t('mweb.account.password')}
          </Text>
          <Text fontSize={12.5} fontWeight="700" color="$muted">
            {hint}
          </Text>
        </YStack>
        <Text
          pressStyle={PRESS_STYLE.inline}
          testID="open-change-password"
          role="button"
          aria-label={label}
          onPress={() => setChangeOpen(true)}
          fontSize={13}
          fontWeight="700"
          color="$primary"
        >
          {action}
        </Text>
      </XStack>

      <YStack height={1} backgroundColor="$borderColor" />

      <DeletionRequestPanel onDone={setNotice} />

      <ChangePasswordDialog
        open={changeOpen}
        hasPassword={hasPassword}
        onClose={() => setChangeOpen(false)}
        onChanged={handleChanged}
      />

      <ConfirmDialog
        open={!!done}
        title={done?.title ?? ''}
        message={done?.message ?? ''}
        confirmLabel={t('mweb.common.done')}
        cancelLabel={t('mweb.common.close')}
        onConfirm={() => setDone(null)}
        onCancel={() => setDone(null)}
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
