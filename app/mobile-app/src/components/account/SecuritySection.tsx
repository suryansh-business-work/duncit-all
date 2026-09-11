import { useCallback, useEffect, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SurfaceCard } from '@/components/SurfaceCard';
import { MobileMyConnectedAccountsDocument } from '@/graphql/account';
import { graphqlRequest } from '@/services/graphql.client';
import { IconDisc } from './IconDisc';
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
    <SurfaceCard testID="security-section" gap={16}>
      <XStack alignItems="center" gap={16}>
        <IconDisc icon="lock-reset" />
        <YStack flex={1}>
          <Text fontSize={15} fontWeight="500" color="$color">
            {t('mweb.account.password')}
          </Text>
          <Text fontSize={14} color="$muted">
            {hint}
          </Text>
        </YStack>
        <XStack
          testID="open-change-password"
          role="button"
          aria-label={label}
          onPress={() => setChangeOpen(true)}
          height={36}
          alignItems="center"
          paddingHorizontal={14}
          borderRadius={999}
          backgroundColor="$soft"
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={13} fontWeight="600" color="$color">
            {action}
          </Text>
        </XStack>
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
    </SurfaceCard>
  );
}
