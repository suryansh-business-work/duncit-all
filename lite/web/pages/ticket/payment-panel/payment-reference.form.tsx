import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';
import { useWebT } from '../../../../shared/i18n';
import { LITE_SUBMIT_PAYMENT_REFERENCE } from '../../../graphql/registrations';
import { makePaymentReferenceSchema, type PaymentReferenceValues } from './payment-reference.types';

interface PaymentReferenceFormProps {
  registrationId: string;
  initialReference: string;
  initialNote: string;
  onSent: () => void;
}

/** Tell the host which payment is yours: the UTR, and a word if it helps. */
export function PaymentReferenceForm({ registrationId, initialReference, initialNote, onSent }: Readonly<PaymentReferenceFormProps>) {
  const { t } = useWebT();
  const schema = useMemo(() => makePaymentReferenceSchema(t), [t]);
  const [submitReference] = useMutation(LITE_SUBMIT_PAYMENT_REFERENCE);
  const { control, handleSubmit, formState } = useForm<PaymentReferenceValues>({
    resolver: zodResolver(schema),
    defaultValues: { reference: initialReference, note: initialNote },
  });

  const submit = handleSubmit(async ({ reference, note }) => {
    try {
      await submitReference({ variables: { registration_id: registrationId, reference, note: note || null } });
      notifySuccess(t('liteWeb.payment.sent'));
      onSent();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  });

  return (
    <Stack component="form" spacing={1.5} onSubmit={submit} noValidate data-testid="payment-reference-form">
      <RhfTextField
        control={control}
        name="reference"
        label={t('liteWeb.payment.reference')}
        hint={t('liteWeb.payment.referenceHint')}
        autoComplete="off"
        slotProps={{ htmlInput: { maxLength: 40, 'data-testid': 'payment-reference' } }}
      />
      <RhfTextField
        control={control}
        name="note"
        label={t('liteWeb.payment.note')}
        hint={t('liteWeb.payment.noteHint')}
        multiline
        minRows={2}
        slotProps={{ htmlInput: { maxLength: 200, 'data-testid': 'payment-note' } }}
      />
      <DuncitButton type="submit" variant="contained" loading={formState.isSubmitting} data-testid="payment-reference-submit">
        {t('liteWeb.payment.submit')}
      </DuncitButton>
    </Stack>
  );
}
