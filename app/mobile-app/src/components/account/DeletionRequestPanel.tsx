import type { Translate } from '@/i18n/fallback';
import { useCallback, useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  MobileAccountDeletionSettingsDocument,
  MobileCancelAccountDeletionRequestDocument,
  MobileMyAccountDeletionRequestDocument,
  MobileRequestAccountDeletionOtpDocument,
} from '@/graphql/account';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLogout } from '@/hooks/useLogout';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { DeletionSubmittedDialog } from './DeletionSubmittedDialog';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  onDone: (message: string) => void;
}

export interface PendingRequest {
  request_id: string;
  requested_at: string;
  scheduled_delete_at: string;
}

const errMsg = (e: unknown, t: Translate) =>
  e instanceof Error ? e.message : t('mweb.account.somethingWentWrong');

/**
 * The deletion corner of Profile Settings — RN twin of mWeb's panel.
 *
 * Two states, never both: the member has an open request, or they can file
 * one. The banner replaces the row rather than sitting beside it, because a
 * "Request deletion" row under a "Deletion requested" notice reads as an
 * invitation to ask twice.
 */
export function DeletionRequestPanel({ onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const { danger, muted } = useThemeColors();
  const { formatDate } = useDateFormat();
  const logout = useLogout();
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const [submitted, setSubmitted] = useState<PendingRequest | null>(null);
  const [retentionDays, setRetentionDays] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await graphqlRequest(MobileMyAccountDeletionRequestDocument, undefined, {
      auth: true,
    });
    setPending(data.myAccountDeletionRequest ?? null);
  }, []);

  useEffect(() => {
    let active = true;
    load().catch((e) => active && setError(errMsg(e, t)));
    return () => {
      active = false;
    };
  }, [load, t]);

  // The window, so the warning below quotes the number the server will actually
  // stamp the request with. A failure here leaves the generic wording rather
  // than a made-up figure.
  useEffect(() => {
    let active = true;
    graphqlRequest(MobileAccountDeletionSettingsDocument, undefined, { auth: true })
      .then((data) => {
        if (active) setRetentionDays(data.accountDeletionSettings.retention_days);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const startFlow = () => {
    setRequesting(true);
    setError(null);
    graphqlRequest(MobileRequestAccountDeletionOtpDocument, undefined, { auth: true })
      .then(() => {
        setConfirmOpen(false);
        setOtpOpen(true);
      })
      .catch((e) => setError(errMsg(e, t)))
      .finally(() => setRequesting(false));
  };

  const withdraw = () => {
    setCancelling(true);
    setError(null);
    graphqlRequest(MobileCancelAccountDeletionRequestDocument, undefined, { auth: true })
      .then(() => load())
      .then(() => onDone(t('mweb.account.deletion.withdrawn')))
      .catch((e) => setError(errMsg(e, t)))
      .finally(() => setCancelling(false));
  };

  const onSubmitted = (request: PendingRequest) => {
    setOtpOpen(false);
    setSubmitted(request);
  };

  const signOut = () => {
    setSubmitted(null);
    logout().catch((e) => setError(errMsg(e, t)));
  };

  const confirmMessage =
    retentionDays === null
      ? t('mweb.account.deletion.confirmSealed')
      : t('mweb.account.deletion.confirmSealedDays', { vars: { days: retentionDays } });

  const errorLine = error ? (
    <Text fontSize={12.5} color="$danger" testID="deletion-panel-error">
      {error}
    </Text>
  ) : null;

  if (pending) {
    return (
      <YStack gap={10} testID="deletion-pending">
        <XStack alignItems="flex-start" gap={10}>
          <MaterialIcons name="hourglass-top" size={18} color={muted} />
          <YStack flex={1} gap={2}>
            <Text fontSize={13.5} fontWeight="700" color="$color">
              {t('mweb.account.deletion.pendingTitle')}
            </Text>
            <Text fontSize={12.5} color="$muted">
              {t('mweb.account.deletion.pendingBody')}
            </Text>
            <Text fontSize={12.5} fontWeight="700" color="$danger">
              {t('mweb.account.deletion.deletesOn', {
                vars: { date: formatDate(pending.scheduled_delete_at) },
              })}
            </Text>
            <Text fontSize={12} color="$muted">
              {t('mweb.account.deletion.pendingRef', { vars: { code: pending.request_id } })}
              {' · '}
              {t('mweb.account.deletion.pendingOn', {
                vars: { date: formatDate(pending.requested_at) },
              })}
            </Text>
          </YStack>
        </XStack>
        <Text
          pressStyle={PRESS_STYLE.inline}
          testID="withdraw-deletion"
          role="button"
          aria-label={t('mweb.account.deletion.withdraw')}
          onPress={withdraw}
          fontSize={13}
          fontWeight="700"
          color="$primary"
        >
          {cancelling
            ? t('mweb.account.deletion.withdrawing')
            : t('mweb.account.deletion.withdraw')}
        </Text>
        {errorLine}
      </YStack>
    );
  }

  return (
    <YStack gap={10}>
      <XStack
        testID="open-delete-account"
        role="button"
        aria-label={t('mweb.account.deletion.action')}
        onPress={() => setConfirmOpen(true)}
        alignItems="center"
        gap={10}
        pressStyle={PRESS_STYLE.row}
      >
        <MaterialIcons name="delete-forever" size={18} color={danger} />
        <Text fontSize={13.5} fontWeight="600" color="$danger">
          {t('mweb.account.deletion.action')}
        </Text>
      </XStack>
      {errorLine}

      <ConfirmDialog
        open={confirmOpen}
        title={t('mweb.account.deletion.confirmTitle')}
        message={confirmMessage}
        confirmLabel={
          requesting ? t('mweb.account.deletion.submitting') : t('mweb.account.deletion.confirmCta')
        }
        cancelLabel={t('mweb.common.cancel')}
        destructive
        onConfirm={startFlow}
        onCancel={() => setConfirmOpen(false)}
      />
      <DeleteAccountDialog
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        onSubmitted={onSubmitted}
      />
      <DeletionSubmittedDialog
        open={!!submitted}
        code={submitted?.request_id ?? ''}
        deletesOn={submitted?.scheduled_delete_at ?? ''}
        onSignOut={signOut}
      />
    </YStack>
  );
}
