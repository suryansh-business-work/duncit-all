import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Alert, Box, MenuItem, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';

import { useStoreSession } from '../../../app/providers/SessionProvider';
import type { StoreMe } from '../../../graphql/account';
import { SUPPORT_TICKET, type StoreSupportTicketInput } from '../../../graphql/support';
import { firstFilled } from '../../../lib/text';
import { useStoreT } from '../../../i18n';
import { CATEGORY_LABEL_KEYS, CATEGORY_VALUES, makeSupportTicketSchema, type SupportTicketValues } from './support-ticket.types';

/** The signed-in shopper's name and email pre-filled; everything else starts blank. */
const initialValues = (me: StoreMe | null): SupportTicketValues => ({
  name: firstFilled(me?.full_name, [me?.first_name, me?.last_name].filter(Boolean).join(' ')),
  email: me?.email ?? '',
  phone: '',
  orderNo: '',
  subject: '',
  category: 'GENERAL',
  message: '',
});

const toInput = (values: SupportTicketValues): StoreSupportTicketInput => ({
  name: values.name,
  email: values.email,
  phone: values.phone || null,
  subject: values.subject,
  category: values.category,
  message: values.message,
  order_no: values.orderNo || null,
});

interface Sent {
  ticketNo: string;
  email: string;
}

/** Raise a support ticket from the store; the reply comes by email. */
export function SupportTicketForm() {
  const { t } = useStoreT();
  const { me } = useStoreSession();
  const [sent, setSent] = useState<Sent | null>(null);
  const [error, setError] = useState('');
  const schema = useMemo(() => makeSupportTicketSchema(t), [t]);
  const values = useMemo(() => initialValues(me), [me]);
  const [send] = useMutation(SUPPORT_TICKET);
  const { control, handleSubmit, formState } = useForm<SupportTicketValues>({
    resolver: zodResolver(schema),
    values,
  });
  const submit = handleSubmit(async (form) => {
    setError('');
    try {
      const { data } = await send({ variables: { input: toInput(form) } });
      if (data) setSent({ ticketNo: data.storeCreateSupportTicket.ticket_no, email: form.email });
    } catch (err) {
      setError(parseApiError(err, t('ecommStore.contact.failed')));
    }
  });
  if (sent) {
    return (
      <Alert severity="success" role="status" data-testid="support-ticket-sent">
        {t('ecommStore.contact.sent', { vars: { ticketNo: sent.ticketNo, email: sent.email } })}
      </Alert>
    );
  }
  return (
    <Stack component="form" spacing={1.5} onSubmit={submit} noValidate data-testid="support-ticket-form">
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <RhfTextField control={control} name="name" label={t('ecommStore.contact.name')} autoComplete="name" required data-testid="support-ticket-name" />
        <RhfTextField control={control} name="email" type="email" label={t('ecommStore.contact.email')} autoComplete="email" required data-testid="support-ticket-email" />
        <RhfTextField
          control={control}
          name="phone"
          type="tel"
          label={t('ecommStore.contact.phone')}
          autoComplete="tel"
          slotProps={{ htmlInput: { inputMode: 'tel' } }}
          data-testid="support-ticket-phone"
        />
        <RhfTextField control={control} name="orderNo" label={t('ecommStore.contact.orderNo')} autoComplete="off" data-testid="support-ticket-order-no" />
      </Box>
      <RhfTextField control={control} name="subject" label={t('ecommStore.contact.subject')} required data-testid="support-ticket-subject" />
      <RhfTextField control={control} name="category" select label={t('ecommStore.contact.category')} required data-testid="support-ticket-category">
        {CATEGORY_VALUES.map((value) => (
          <MenuItem key={value} value={value}>
            {t(CATEGORY_LABEL_KEYS[value])}
          </MenuItem>
        ))}
      </RhfTextField>
      <RhfTextField control={control} name="message" label={t('ecommStore.contact.message')} multiline minRows={4} required data-testid="support-ticket-message" />
      <Stack aria-live="assertive">
        {error ? (
          <Alert severity="error" data-testid="support-ticket-error">
            {error}
          </Alert>
        ) : null}
      </Stack>
      <DuncitButton type="submit" variant="contained" size="large" loading={formState.isSubmitting} sx={{ alignSelf: 'flex-start' }} data-testid="support-ticket-send">
        {t('ecommStore.contact.send')}
      </DuncitButton>
    </Stack>
  );
}
