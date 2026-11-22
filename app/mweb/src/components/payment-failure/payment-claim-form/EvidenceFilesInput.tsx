import { Controller, type Control } from 'react-hook-form';
import { FormHelperText, Stack, Typography } from '@mui/material';
import {
  PAYMENT_EVIDENCE_FOLDER,
  PAYMENT_EVIDENCE_HINT_KEYS,
  PAYMENT_EVIDENCE_MAX_FILES,
  PAYMENT_EVIDENCE_MIME_TYPES,
  paymentEvidenceAccepts,
  type PaymentEvidenceFileType,
} from '@duncit/forms/schemas';
import AttachmentsField from '../../../forms/support-form/AttachmentsField';
import { useTranslation } from '../../../i18n/useTranslation';
import type { PaymentClaimFormValues } from './payment-claim.types';

interface Props {
  control: Control<PaymentClaimFormValues>;
  type: PaymentEvidenceFileType;
}

const max = PAYMENT_EVIDENCE_MAX_FILES;

/**
 * The upload half of the claim: support's attachment field, pointed at the
 * private evidence folder and narrowed to what this option takes (images for a
 * screenshot, images or PDF for a statement).
 */
export default function EvidenceFilesInput({ control, type }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name="file_refs"
      render={({ field, fieldState }) => (
        <Stack spacing={1} data-testid={`payment-claim-files-${type}`}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t(PAYMENT_EVIDENCE_HINT_KEYS[type], { vars: { max } })}
          </Typography>
          <AttachmentsField
            attachments={field.value}
            setAttachments={field.onChange}
            folder={PAYMENT_EVIDENCE_FOLDER}
            accept={PAYMENT_EVIDENCE_MIME_TYPES[type].join(',')}
            checkFile={(file) => (paymentEvidenceAccepts(type, file.type) ? null : t('mweb.payment.claim.wrongFileType'))}
            labels={{
              caption: t('mweb.payment.claim.filesCount', { vars: { count: field.value.length, max } }),
              add: t('mweb.payment.claim.addFiles'),
            }}
          />
          {fieldState.error && (
            <FormHelperText error role="alert" data-testid="payment-claim-files-error">
              {fieldState.error.message}
            </FormHelperText>
          )}
        </Stack>
      )}
    />
  );
}
