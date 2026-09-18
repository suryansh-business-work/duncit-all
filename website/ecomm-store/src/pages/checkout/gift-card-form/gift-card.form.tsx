import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';

import { REDEEM_GIFT_CARD } from '../../../graphql/account';
import { useStoreT } from '../../../i18n';
import { makeGiftCardSchema, type GiftCardValues } from './gift-card.types';

/** Redeem a gift card into Duncit Coins, which this checkout can then spend. */
export function GiftCardForm({ onRedeemed }: Readonly<{ onRedeemed: () => void }>) {
  const { t } = useStoreT();
  const schema = useMemo(() => makeGiftCardSchema(t), [t]);
  const [redeem] = useMutation(REDEEM_GIFT_CARD);
  const { control, handleSubmit, setError, reset, formState } = useForm<GiftCardValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '' },
  });
  const submit = handleSubmit(async ({ code }) => {
    try {
      const { data } = await redeem({ variables: { code: code.toUpperCase() } });
      const added = data?.redeemGiftCard.coins_added ?? 0;
      notifySuccess(t('ecommStore.giftCard.redeemed', { vars: { coins: added } }));
      reset({ code: '' });
      onRedeemed();
    } catch (error) {
      setError('code', { message: parseApiError(error, t('ecommStore.giftCard.failed')) });
    }
  });
  return (
    <Stack component="form" direction="row" spacing={1} onSubmit={submit} noValidate sx={{ alignItems: 'flex-start' }}>
      <RhfTextField control={control} name="code" size="small" autoComplete="off" label={t('ecommStore.giftCard.label')} hint={t('ecommStore.giftCard.hint')} />
      <DuncitButton type="submit" variant="outlined" loading={formState.isSubmitting} sx={{ minHeight: 40 }}>
        {t('ecommStore.giftCard.redeem')}
      </DuncitButton>
    </Stack>
  );
}
