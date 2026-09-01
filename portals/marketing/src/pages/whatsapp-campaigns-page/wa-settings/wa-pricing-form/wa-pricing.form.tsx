import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Stack, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { WA_CATEGORY_LABELS, waMoney } from '../../helpers';
import {
  waPricingSchema,
  type WaPricingFormProps,
  type WaPricingValues,
} from './wa-pricing.types';
import { useTranslation } from '@duncit/app-settings';

export { waPricingSchema };
export { fromWaPricing, toUpdateWaPricingInput } from './wa-pricing.types';

/** The four rate fields, in the order the rate card is usually quoted. */
const RATE_FIELDS = [
  {
    name: 'marketing_per_msg',
    label: WA_CATEGORY_LABELS.MARKETING,
    hint: 'Promotions, offers, anything that sells.',
  },
  {
    name: 'utility_per_msg',
    label: WA_CATEGORY_LABELS.UTILITY,
    hint: 'Order updates, reminders, account notices.',
  },
  {
    name: 'authentication_per_msg',
    label: WA_CATEGORY_LABELS.AUTHENTICATION,
    hint: 'One-time passcodes and verification.',
  },
  {
    name: 'service_per_msg',
    label: WA_CATEGORY_LABELS.SERVICE,
    hint: 'Replies inside a customer-opened conversation. Usually free — leave it at 0.',
  },
] as const;

/** What 1,000 messages of each kind would cost — a rate per message is hard to
 * feel, and a typo of one decimal place is not. */
function RateExample({ values }: Readonly<{ values: WaPricingValues }>) {
  const symbol = values.currency_symbol.trim() || '₹';
  return (
    <Alert severity="info" icon={false}>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 800,
          display: "block"
        }}>
        1,000 messages would cost
      </Typography>
      <Typography variant="body2">
        {RATE_FIELDS.map(
          (field) => `${field.label} ${waMoney(Number(values[field.name]) * 1000, symbol)}`
        ).join(' · ')}
      </Typography>
    </Alert>
  );
}

export default function WaPricingForm({
  initialValues,
  busy,
  onSubmit,
}: Readonly<WaPricingFormProps>) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset, watch, formState } = useForm<WaPricingValues, any, WaPricingValues>({
    defaultValues: initialValues,
    resolver: zodResolver(waPricingSchema) as unknown as Resolver<WaPricingValues, any, WaPricingValues>,
    mode: 'onChange',
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const values = watch();

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={2}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          }}
        >
          {RATE_FIELDS.map((field) => (
            <RhfTextField
              key={field.name}
              control={control}
              name={field.name}
              label={`${field.label} — per message`}
              hint={field.hint}
            />
          ))}
          <RhfTextField
            control={control}
            name="currency_symbol"
            label={t('marketing.common.currencySymbol')}
            hint="Printed in front of every cost on this page"
          />
        </Box>

        <RateExample values={values} />

        <Box>
          <DuncitButton
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={busy || !formState.isValid}
          >
            {busy ? 'Saving…' : 'Save rates'}
          </DuncitButton>
        </Box>
      </Stack>
    </form>
  );
}
