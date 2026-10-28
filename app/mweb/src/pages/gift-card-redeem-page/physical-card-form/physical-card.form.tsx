import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Card, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import RhfTextField from '../../../forms/components/RhfTextField';
import { useTranslation } from '../../../i18n/useTranslation';
import {
  formatPhysicalGiftCardNumber,
  formatPhysicalGiftCardPasscode,
  makePhysicalGiftCardSchema,
  physicalGiftCardDefaults,
  type PhysicalCardFormProps,
  type PhysicalGiftCardValues,
} from './physical-card.types';

/** Both boxes take digits: the numeric keypad on a phone, and no spell-check
 * squiggles or saved-value suggestions on a one-time code. */
const NUMERIC_INPUT = { inputMode: 'numeric', spellCheck: false } as const;

/**
 * A printed gift card's number and the passcode under its scratch panel. The
 * passcode box groups the digits `XXXX-XXXX-XXXX-XXXX` as they are typed, the
 * way the card prints them. Native twin: forms/physical-gift-card.
 */
export function PhysicalCardForm({ saving, errorMessage, onSubmit }: Readonly<PhysicalCardFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makePhysicalGiftCardSchema(t), [t]);
  const { control, handleSubmit } = useForm<PhysicalGiftCardValues>({
    defaultValues: physicalGiftCardDefaults,
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });

  return (
    <Card data-testid="gift-card-physical-form" sx={{ p: 2 }}>
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('mweb.giftCards.physicalIntro')}
          </Typography>
          <RhfTextField
            control={control}
            name="card_number"
            required
            autoComplete="off"
            label={t('mweb.giftCards.cardNumberLabel')}
            hint={t('mweb.giftCards.cardNumberHint')}
            placeholder={t('mweb.giftCards.cardNumberPlaceholder')}
            format={formatPhysicalGiftCardNumber}
            slotProps={{ htmlInput: NUMERIC_INPUT }}
          />
          <RhfTextField
            control={control}
            name="passcode"
            required
            autoComplete="off"
            label={t('mweb.giftCards.passcodeLabel')}
            hint={t('mweb.giftCards.passcodeHint')}
            placeholder={t('mweb.giftCards.passcodePlaceholder')}
            format={formatPhysicalGiftCardPasscode}
            slotProps={{ htmlInput: NUMERIC_INPUT }}
          />
          {errorMessage && (
            <Alert data-testid="gift-card-physical-error" severity="error">
              {errorMessage}
            </Alert>
          )}
          <DuncitButton
            data-testid="gift-card-physical-redeem"
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={saving}
          >
            {t('mweb.giftCards.redeemCta')}
          </DuncitButton>
        </Stack>
      </form>
    </Card>
  );
}
