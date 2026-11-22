import { useMemo } from 'react';
import { useController, type Control } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import {
  PAYMENT_EVIDENCE_FOLDER,
  PAYMENT_EVIDENCE_HINT_KEYS,
  PAYMENT_EVIDENCE_MAX_FILES,
  PAYMENT_EVIDENCE_MIME_TYPES,
  paymentEvidenceAccepts,
  type PaymentClaimValues,
  type PaymentEvidenceFileType,
} from '@duncit/forms/schemas';

import { TicketAttachments } from '@/components/support/TicketAttachments';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  control: Control<PaymentClaimValues>;
  type: PaymentEvidenceFileType;
}

const max = PAYMENT_EVIDENCE_MAX_FILES;

/**
 * The upload half of the claim: support's attachment control, pointed at the
 * private evidence folder and narrowed to what this option takes (images for a
 * screenshot, images or PDF for a statement). Twin of mWeb's EvidenceFilesInput.
 */
export function EvidenceFiles({ control, type }: Readonly<Props>) {
  const { t } = useTranslation();
  const { field, fieldState } = useController({ control, name: 'file_refs' });
  const filter = useMemo(
    () => ({
      types: PAYMENT_EVIDENCE_MIME_TYPES[type],
      accepts: (mime: string) => paymentEvidenceAccepts(type, mime),
      refusal: t('mweb.payment.claim.wrongFileType'),
    }),
    [type, t],
  );

  return (
    <YStack gap={6} testID={`payment-claim-files-${type}`}>
      <Text fontSize={12} color="$muted">
        {t(PAYMENT_EVIDENCE_HINT_KEYS[type], { vars: { max } })}
      </Text>
      <TicketAttachments
        attachments={field.value}
        onChange={field.onChange}
        folder={PAYMENT_EVIDENCE_FOLDER}
        filter={filter}
        labels={{
          caption: t('mweb.payment.claim.filesCount', { vars: { count: field.value.length, max } }),
          add: t('mweb.payment.claim.addFiles'),
        }}
        aiMonitoring={false}
      />
      {fieldState.error?.message ? (
        <Text testID="payment-claim-files-error" role="alert" fontSize={12} color="$danger">
          {fieldState.error.message}
        </Text>
      ) : null}
    </YStack>
  );
}
