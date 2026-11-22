import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import {
  makePaymentClaimSchema,
  paymentClaimDefaults,
  type PaymentClaimValues,
} from '@duncit/forms/schemas';
import { formatPhoneLine } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { FormTextField } from '@/components/FormTextField';
import { useMe } from '@/hooks/useMe';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { usePaymentClaim } from '../usePaymentClaim';
import { ClaimContactFooter } from './ClaimContactFooter';
import { EvidenceFiles } from './EvidenceFiles';
import { EvidenceOptions } from './EvidenceOptions';

interface Props {
  paymentDocId: string;
  onClose: () => void;
}

/**
 * "My payment was deducted but booking was not completed" — React Hook Form +
 * the shared Zod contract (@duncit/forms). Mounted only while open, so every
 * opening is one attempt with its own request id. RN twin of mWeb's
 * PaymentClaimDialog + PaymentClaimForm.
 */
export function PaymentClaimSheet({ paymentDocId, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const me = useMe().data?.me;
  const claim = usePaymentClaim(paymentDocId);
  const schema = useMemo(() => makePaymentClaimSchema(t), [t]);
  const { control, handleSubmit, setValue, clearErrors } = useForm<
    PaymentClaimValues,
    unknown,
    PaymentClaimValues
  >({
    defaultValues: paymentClaimDefaults,
    resolver: formResolver<PaymentClaimValues>(schema),
  });
  const evidenceType = useWatch({ control, name: 'evidence_type' });
  const contact = {
    phone: formatPhoneLine(me?.phone_extension, me?.phone_number),
    email: me?.email ?? '',
  };

  // A statement's PDF is no screenshot: switching option starts the evidence afresh.
  const onSwitch = () => {
    setValue('file_refs', []);
    setValue('transaction_id', '');
    clearErrors();
  };

  const footer = claim.result ? (
    <DuncitButton
      label={t('mweb.payment.claim.done')}
      fullWidth
      testID="payment-claim-done"
      onPress={onClose}
    />
  ) : (
    <XStack gap={12}>
      <YStack flex={1}>
        <DuncitButton
          label={t('mweb.payment.claim.cancel')}
          variant="outline"
          fullWidth
          disabled={claim.submitting}
          testID="payment-claim-cancel"
          onPress={onClose}
        />
      </YStack>
      <YStack flex={1}>
        <DuncitButton
          label={
            claim.submitting ? t('mweb.payment.claim.submitting') : t('mweb.payment.claim.submit')
          }
          fullWidth
          loading={claim.submitting}
          testID="payment-claim-submit"
          onPress={handleSubmit(claim.submit)}
        />
      </YStack>
    </XStack>
  );

  const opened = claim.result
    ? t(
        claim.result.already_open ? 'mweb.payment.claim.alreadyOpen' : 'mweb.payment.claim.success',
        {
          vars: { ticket: claim.result.ticket_no },
        },
      )
    : null;

  return (
    <DuncitDialog
      open
      onClose={onClose}
      testID="payment-claim-sheet"
      title={t('mweb.payment.claim.title')}
      closeLabel={t('mweb.payment.close')}
      dismissOnBackdrop={!claim.submitting}
      footer={footer}
    >
      {opened ? (
        <YStack
          padding={12}
          borderRadius={16}
          backgroundColor="$successSoft"
          testID="payment-claim-success"
        >
          <Text role="alert" fontSize={14} color="$color">
            {opened}
          </Text>
        </YStack>
      ) : (
        <YStack gap={14} testID="payment-claim-form">
          <Text fontSize={13} color="$muted">
            {t('mweb.payment.claim.intro')}
          </Text>
          <EvidenceOptions control={control} onSwitch={onSwitch} />
          {evidenceType === 'TRANSACTION_ID' ? (
            <FormTextField
              control={control}
              name="transaction_id"
              label={t('mweb.payment.claim.transactionIdLabel')}
              hint={t('mweb.payment.claim.transactionIdHint')}
              required
              autoCapitalize="none"
              autoComplete="off"
            />
          ) : (
            <EvidenceFiles control={control} type={evidenceType} />
          )}
          <ClaimContactFooter contact={contact} />
          {claim.error ? (
            <Text testID="payment-claim-error" role="alert" fontSize={13} color="$danger">
              {claim.error}
            </Text>
          ) : null}
        </YStack>
      )}
    </DuncitDialog>
  );
}
