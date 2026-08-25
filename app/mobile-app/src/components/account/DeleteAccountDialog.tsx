import type { Translate } from '@/i18n/fallback';
import { useState } from 'react';
import { Text, YStack } from 'tamagui';

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
        <Text fontSize={13.5} color="$muted" testID="delete-account-info">
          {info}
        </Text>
        <Text fontSize={13.5} color="$muted">
          {t('mweb.account.deletion.otpIntro')}
        </Text>
        <DeleteAccountForm loading={submitting} errorMessage={error} onSubmit={handleSubmit} />
        <Text
          testID="delete-account-resend"
          role="button"
          aria-label={t('mweb.account.deletion.resend')}
          onPress={handleResend}
          fontSize={13.5}
          fontWeight="700"
          color="$primary"
          textAlign="center"
        >
          {resending ? t('mweb.account.deletion.resending') : t('mweb.account.deletion.resend')}
        </Text>
      </YStack>
    </SecuritySheet>
  );
}
