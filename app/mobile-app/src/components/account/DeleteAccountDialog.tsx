import { useState } from 'react';
import { Text, YStack } from 'tamagui';

import { DeleteAccountForm, type DeleteAccountValues } from '@/forms/delete-account';
import {
  MobileDeleteMyAccountDocument,
  MobileRequestAccountDeletionOtpDocument,
} from '@/graphql/account';
import { graphqlRequest } from '@/services/graphql.client';
import { SecuritySheet } from './SecuritySheet';

export interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

/** OTP step of the delete-account flow (Tamagui) — RN twin of mWeb's dialog.
 * The danger confirmation lives in the parent ConfirmDialog, which requests the
 * OTP before opening this sheet. */
export function DeleteAccountDialog({
  open,
  onClose,
  onDeleted,
}: Readonly<DeleteAccountDialogProps>) {
  const [info, setInfo] = useState('OTP sent to your email.');
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleResend = () => {
    setResending(true);
    setError(null);
    graphqlRequest(MobileRequestAccountDeletionOtpDocument, undefined, { auth: true })
      .then(() => setInfo('OTP sent to your email.'))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setResending(false));
  };

  const handleDelete = async (values: DeleteAccountValues) => {
    setDeleting(true);
    setError(null);
    try {
      await graphqlRequest(
        MobileDeleteMyAccountDocument,
        { input: { otp: values.otp } },
        { auth: true },
      );
      onDeleted();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SecuritySheet
      open={open}
      title="Delete account"
      testID="delete-account-dialog"
      onClose={onClose}
    >
      <YStack gap={12}>
        <Text fontSize={13.5} color="$muted" testID="delete-account-info">
          {info}
        </Text>
        <Text fontSize={13.5} color="$muted">
          Enter the one-time code to permanently delete your account.
        </Text>
        <DeleteAccountForm loading={deleting} errorMessage={error} onSubmit={handleDelete} />
        <Text
          testID="delete-account-resend"
          role="button"
          aria-label="Resend OTP"
          onPress={handleResend}
          fontSize={13.5}
          fontWeight="700"
          color="$primary"
          textAlign="center"
        >
          {resending ? 'Resending…' : 'Resend OTP'}
        </Text>
      </YStack>
    </SecuritySheet>
  );
}
