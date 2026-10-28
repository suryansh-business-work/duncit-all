import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { RhfTextField } from '@duncit/forms';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import MemberMultiPicker from '../../../../components/members/MemberMultiPicker';
import { formatCoins } from '../labels';
import {
  GENERATE_DEFAULTS,
  LABEL_MAX,
  cardCount,
  makeGenerateCardsSchema,
  type GenerateCardsFormProps,
  type GenerateCardsValues,
} from './generate-cards.types';

const MODE_LABEL_ID = 'generate-cards-mode-label';

/**
 * Mint a batch of printed cards: a name, the coins on each card, who the cards
 * are for (anyone holding one, or chosen members — one card each), and how long
 * they stay redeemable.
 */
export default function GenerateCardsForm({ policy, busy, errorMessage, onSubmit }: Readonly<GenerateCardsFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeGenerateCardsSchema(t, policy), [t, policy]);
  const { control, handleSubmit } = useForm<GenerateCardsValues>({
    defaultValues: GENERATE_DEFAULTS,
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });
  const [mode, quantity, members, coinsText] = useWatch({ control, name: ['mode', 'quantity', 'members', 'coins'] });
  const count = cardCount({ mode, quantity, members });
  const coins = Number(coinsText) || 0;

  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(values))} data-testid="generate-cards-form">
      <Stack spacing={2.5} sx={{ maxWidth: 560 }}>
        {errorMessage && (
          <Alert severity="error" data-testid="generate-cards-error">
            {errorMessage}
          </Alert>
        )}

        <RhfTextField
          control={control}
          name="label"
          label={t('loyalty.physical.labelLabel')}
          hint={t('loyalty.physical.labelHint')}
          required
          slotProps={{ htmlInput: { maxLength: LABEL_MAX } }}
          data-testid="generate-cards-label"
        />

        <RhfTextField
          control={control}
          name="coins"
          label={t('loyalty.physical.coinsLabel')}
          hint={t('loyalty.physical.coinsHint', { vars: { max: formatCoins(policy.max_coins_per_card) } })}
          required
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          data-testid="generate-cards-coins"
        />

        <Controller
          control={control}
          name="mode"
          render={({ field }) => (
            <FormControl>
              <FormLabel id={MODE_LABEL_ID}>{t('loyalty.physical.modeLabel')}</FormLabel>
              <RadioGroup {...field} aria-labelledby={MODE_LABEL_ID} data-testid="generate-cards-mode">
                <FormControlLabel value="BULK" control={<Radio />} label={t('loyalty.physical.modeBulk')} />
                <FormHelperText sx={{ mt: -0.5, ml: 4 }}>{t('loyalty.physical.modeBulkHint')}</FormHelperText>
                <FormControlLabel value="MEMBERS" control={<Radio />} label={t('loyalty.physical.modeMembers')} />
                <FormHelperText sx={{ mt: -0.5, ml: 4 }}>{t('loyalty.physical.modeMembersHint')}</FormHelperText>
              </RadioGroup>
            </FormControl>
          )}
        />

        {mode === 'BULK' ? (
          <RhfTextField
            control={control}
            name="quantity"
            label={t('loyalty.physical.quantityLabel')}
            hint={t('loyalty.physical.quantityHint', { vars: { max: policy.max_cards_per_batch } })}
            required
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
            data-testid="generate-cards-quantity"
          />
        ) : (
          <Controller
            control={control}
            name="members"
            render={({ field, fieldState }) => (
              <MemberMultiPicker
                value={field.value}
                onChange={field.onChange}
                label={t('loyalty.physical.membersLabel')}
                helperText={fieldState.error?.message ?? t('loyalty.physical.membersSearchHint')}
                error={Boolean(fieldState.error)}
              />
            )}
          />
        )}

        <Controller
          control={control}
          name="expires_on"
          render={({ field, fieldState }) => (
            <DatePicker
              label={t('loyalty.physical.expiryLabel')}
              value={field.value}
              onChange={(date) => field.onChange(date)}
              disablePast
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: Boolean(fieldState.error),
                  helperText:
                    fieldState.error?.message ??
                    t('loyalty.physical.expiryHint', { vars: { n: policy.validity_months } }),
                },
              }}
            />
          )}
        />

        <Typography variant="body2" sx={{ fontWeight: 700 }} aria-live="polite" data-testid="generate-cards-summary">
          {t('loyalty.physical.summary', {
            vars: { count: formatCoins(count), coins: formatCoins(coins), total: formatCoins(count * coins) },
          })}
        </Typography>

        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton type="submit" variant="contained" loading={busy} disabled={busy} data-testid="generate-cards-submit">
            {t('loyalty.physical.submit')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
