import type { Translate } from '@/i18n/fallback';
import { useState } from 'react';
import { Text, YStack } from 'tamagui';
import {
  ACCOUNT_DELETION_REVOKE_REASON,
  holdSessionRevoked,
  releaseSessionRevoked,
} from '@duncit/user-core';

import { DeleteAccountForm, type DeleteAccountValues } from '@/forms/delete-account';
import {
  MobileRequestAccountDeletionOtpDocument,
  MobileSubmitAccountDeletionRequestDocument,
} from '@/graphql/account';
import { AccountDeletionSurface } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';
import { SecuritySheet } from './SecuritySheet';
import type { PendingRequest } from './DeletionRequestPanel';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
  /** Hands the filed request up: the parent tells the member the date on it,
   * then signs them out. */
  onSubmitted: (request: PendingRequest) => void;
}

const errMsg = (e: unknown, t: Translate) =>
  e instanceof Error ? e.message : t('mweb.account.somethingWentWrong');

/**
 * The code step of the deletion flow (Tamagui) — RN twin of mWeb's dialog.
 *
 * Submitting FILES a request; it does not delete. The copy says so, because a
 * sheet that still said "permanently delete" would be describing something
 * that no longer happens here.
 */
export function DeleteAccountDialog({
  open,
  onClose,
  onSubmitted,
}: Readonly<DeleteAccountDialogProps>) {
  const { t } = useTranslation();
  const [info, setInfo] = useState(t('mweb.account.deletion.otpSent'));
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleResend = () => {
    setResending(true);
    setError(null);
    graphqlRequest(MobileRequestAccountDeletionOtpDocument, undefined, { auth: true })
      .then(() => setInfo(t('mweb.account.deletion.otpSent')))
      .catch((e) => setError(errMsg(e, t)))
      .finally(() => setResending(false));
  };

  const handleSubmit = async (values: DeleteAccountValues) => {
    setSubmitting(true);
    setError(null);
    // Filing ends every session, and the socket can say so before this answer
    // lands — so this install holds that frame off until the member signs out
    // from the "request received" dialog. Other devices sign out at once.
    holdSessionRevoked(ACCOUNT_DELETION_REVOKE_REASON);
    try {
      const data = await graphqlRequest(
        MobileSubmitAccountDeletionRequestDocument,
        {
          input: {
            otp: values.otp,
            reason: values.reason,
            surface: AccountDeletionSurface.App,
          },
        },
        { auth: true },
      );
      onSubmitted(data.submitAccountDeletionRequest);
    } catch (e) {
      releaseSessionRevoked(ACCOUNT_DELETION_REVOKE_REASON);
      setError(errMsg(e, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SecuritySheet
      open={open}
      title={t('mweb.account.deletion.action')}
      testID="delete-account-dialog"
      onClose={onClose}
    >
      <YStack gap={12}>
        <Text fontSize={13.5} color="$muted" testID="delete-account-info" role="status">
          {info}
        </Text>
        <Text fontSize={13.5} color="$muted">
          {t('mweb.account.deletion.otpIntro')}
        </Text>
        <DeleteAccountForm loading={submitting} errorMessage={error} onSubmit={handleSubmit} />
        <Text
          pressStyle={PRESS_STYLE.inline}
          testID="delete-account-resend"
          role="button"
          aria-label={t('mweb.account.deletion.resend')}
          aria-busy={resending}
          onPress={handleResend}
          fontSize={14}
          fontWeight="600"
          color="$accent"
          textAlign="center"
        >
          {resending ? t('mweb.account.deletion.resending') : t('mweb.account.deletion.resend')}
        </Text>
      </YStack>
    </SecuritySheet>
  );
}
