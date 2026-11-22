import { useMemo } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, DialogActions, DialogContent, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { paymentClaimDefaults } from '@duncit/forms/schemas';
import RhfTextField from '../../../forms/components/RhfTextField';
import { useTranslation } from '../../../i18n/useTranslation';
import ClaimContactFooter from './ClaimContactFooter';
import EvidenceFilesInput from './EvidenceFilesInput';
import EvidenceOptions from './EvidenceOptions';
import { makePaymentClaimFormSchema } from './payment-claim.schema';
import type { PaymentClaimFormProps, PaymentClaimFormValues } from './payment-claim.types';

/**
 * "My payment was deducted but booking was not completed" — React Hook Form +
 * the shared Zod contract. The buyer picks one way to show the deduction and
 * only that one is judged and sent. Native twin: PaymentClaimSheet.
 */
export default function PaymentClaimForm({ submitting, error, contact, onSubmit, onCancel }: Readonly<PaymentClaimFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makePaymentClaimFormSchema(t), [t]);
  const { control, handleSubmit, setValue, clearErrors } = useForm<PaymentClaimFormValues, unknown, PaymentClaimFormValues>({
    defaultValues: paymentClaimDefaults,
    resolver: zodResolver(schema) as unknown as Resolver<PaymentClaimFormValues, unknown, PaymentClaimFormValues>,
  });
  const evidenceType = useWatch({ control, name: 'evidence_type' });

  // A statement's PDF is no screenshot: switching option starts the evidence afresh.
  const onSwitch = () => {
    setValue('file_refs', []);
    setValue('transaction_id', '');
    clearErrors();
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} data-testid="payment-claim-form">
      <DialogContent sx={{ pt: 0 }}>
        <Stack spacing={2}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('mweb.payment.claim.intro')}
          </Typography>
          <EvidenceOptions control={control} onSwitch={onSwitch} />
          {evidenceType === 'TRANSACTION_ID' ? (
            <RhfTextField
              control={control}
              name="transaction_id"
              label={t('mweb.payment.claim.transactionIdLabel')}
              hint={t('mweb.payment.claim.transactionIdHint')}
              required
              size="small"
              autoComplete="off"
            />
          ) : (
            <EvidenceFilesInput control={control} type={evidenceType} />
          )}
          <ClaimContactFooter contact={contact} />
          {error && (
            <Alert severity="error" role="alert" data-testid="payment-claim-error">
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <DuncitButton fullWidth variant="outlined" onClick={onCancel} disabled={submitting} data-testid="payment-claim-cancel">
          {t('mweb.payment.claim.cancel')}
        </DuncitButton>
        <DuncitButton fullWidth type="submit" variant="contained" loading={submitting} data-testid="payment-claim-submit">
          {submitting ? t('mweb.payment.claim.submitting') : t('mweb.payment.claim.submit')}
        </DuncitButton>
      </DialogActions>
    </form>
  );
}
