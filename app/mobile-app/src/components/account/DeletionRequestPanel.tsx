import type { Translate } from '@/i18n/fallback';
import { useCallback, useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  MobileCancelAccountDeletionRequestDocument,
  MobileMyAccountDeletionRequestDocument,
  MobileRequestAccountDeletionOtpDocument,
} from '@/graphql/account';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { DeleteAccountDialog } from './DeleteAccountDialog';

interface Props {
  onDone: (message: string) => void;
}

interface PendingRequest {
  request_id: string;
  requested_at: string;
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
  const [pending, setPending] = useState<PendingRequest | null>(null);
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

  const onSubmitted = () => {
    setOtpOpen(false);
    load()
      .then(() => onDone(t('mweb.account.deletion.submitted')))
      .catch((e) => setError(errMsg(e, t)));
  };

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
        pressStyle={{ opacity: 0.7 }}
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
        message={t('mweb.account.deletion.confirmMessage')}
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
    </YStack>
  );
}
