import type { Translate } from '@/i18n/fallback';
import { useCallback, useEffect, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import {
  MobileCancelAccountDeletionRequestDocument,
  MobileMyAccountDeletionRequestDocument,
} from '@/graphql/account';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { useAuthStore } from '@/stores/auth.store';

interface PendingRequest {
  request_id: string;
  scheduled_delete_at: string;
  days_remaining?: number | null;
}

const errMsg = (e: unknown, t: Translate) =>
  e instanceof Error ? e.message : t('mweb.account.somethingWentWrong');

/**
 * The first thing a member sees on signing back in with a deletion pending.
 * RN twin of mWeb's dialog (rule 27).
 *
 * Filing the request signs them out, so this is the other half of that: coming
 * back has to mean being told the account is on a clock, and being offered the
 * way off it in the same breath. Anything less and the only warning they ever
 * got was on a screen they were signed out of.
 *
 * Asked once per signed-in session. There is no page reload on native, so the
 * gate is the token itself: this is mounted under the tabs, which are rebuilt
 * from scratch when the auth store flips — so a sign-out and a sign-in ask
 * again, and moving between tabs does not.
 */
export function DeletionNoticeDialog() {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const token = useAuthStore((s) => s.token);
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    graphqlRequest(MobileMyAccountDeletionRequestDocument, undefined, { auth: true })
      .then((data) => {
        if (active) setPending(data.myAccountDeletionRequest ?? null);
      })
      // Silent: a member who cannot be told is no worse off than before, and an
      // error banner over the home screen for a query nobody asked for is not
      // the place to surface a network blip.
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [token]);

  const close = useCallback(() => setDismissed(true), []);

  const withdraw = useCallback(() => {
    setCancelling(true);
    setError(null);
    graphqlRequest(MobileCancelAccountDeletionRequestDocument, undefined, { auth: true })
      .then(() => {
        setPending(null);
        setDismissed(true);
      })
      .catch((e) => setError(errMsg(e, t)))
      .finally(() => setCancelling(false));
  }, [t]);

  if (dismissed || !pending) return null;

  const footer = (
    <XStack gap={12}>
      <XStack
        testID="deletion-notice-keep"
        role="button"
        aria-label={t('mweb.account.deletion.noticeKeep')}
        onPress={close}
        flex={1}
        height={46}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        pressStyle={{ opacity: 0.85 }}
      >
        <Text fontSize={14} fontWeight="600" color="$color">
          {t('mweb.account.deletion.noticeKeep')}
        </Text>
      </XStack>
      <XStack
        testID="deletion-notice-withdraw"
        role="button"
        aria-label={t('mweb.account.deletion.withdraw')}
        onPress={withdraw}
        flex={1}
        height={46}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        backgroundColor="$primary"
        pressStyle={{ opacity: 0.85 }}
      >
        <Text fontSize={14} fontWeight="700" color="$onPrimary">
          {cancelling
            ? t('mweb.account.deletion.withdrawing')
            : t('mweb.account.deletion.withdraw')}
        </Text>
      </XStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open
      onClose={close}
      testID="deletion-notice"
      title={t('mweb.account.deletion.noticeTitle')}
      closeLabel={t('mweb.common.close')}
      dismissOnBackdrop={false}
      footer={footer}
    >
      <YStack gap={10}>
        <Text fontSize={13.5} fontWeight="700" color="$danger">
          {t('mweb.account.deletion.deletesOn', {
            vars: { date: formatDate(pending.scheduled_delete_at) },
          })}
        </Text>
        {pending.days_remaining != null && (
          <Text fontSize={12.5} fontWeight="700" color="$muted">
            {t('mweb.account.deletion.noticeDaysLeft', {
              vars: { count: pending.days_remaining },
            })}
          </Text>
        )}
        <Text fontSize={12.5} color="$muted">
          {t('mweb.account.deletion.noticeBody')}
        </Text>
        <Text fontSize={12} color="$muted">
          {t('mweb.account.deletion.pendingRef', { vars: { code: pending.request_id } })}
        </Text>
        {error && (
          <Text fontSize={12.5} color="$danger" testID="deletion-notice-error">
            {error}
          </Text>
        )}
      </YStack>
    </DuncitDialog>
  );
}
