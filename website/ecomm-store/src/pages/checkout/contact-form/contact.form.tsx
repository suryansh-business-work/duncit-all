import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';

import { useStoreT } from '../../../i18n';
import type { CheckoutContact } from '../useCheckoutState';
import { makeContactSchema, type ContactValues } from './contact.types';

interface ContactFormProps {
  initial: CheckoutContact;
  onDone: (contact: CheckoutContact) => void;
}

/** Name, email and mobile for the order — prefilled from the account when signed in. */
export function ContactForm({ initial, onDone }: Readonly<ContactFormProps>) {
  const { t } = useStoreT();
  const schema = useMemo(() => makeContactSchema(t), [t]);
  const { control, handleSubmit } = useForm<ContactValues>({ resolver: zodResolver(schema), values: initial });
  return (
    <Stack component="form" spacing={1.5} onSubmit={handleSubmit(onDone)} noValidate>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <RhfTextField control={control} name="name" label={t('ecommStore.checkout.name')} autoComplete="name" required />
        <RhfTextField control={control} name="email" type="email" label={t('ecommStore.checkout.email')} autoComplete="email" required />
        <RhfTextField
          control={control}
          name="phone"
          type="tel"
          label={t('ecommStore.checkout.phone')}
          hint={t('ecommStore.checkout.phoneHint')}
          autoComplete="tel-national"
          required
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        />
      </Box>
      <DuncitButton type="submit" variant="contained" size="large" sx={{ alignSelf: 'flex-start' }}>
        {t('ecommStore.checkout.continue')}
      </DuncitButton>
    </Stack>
  );
}
