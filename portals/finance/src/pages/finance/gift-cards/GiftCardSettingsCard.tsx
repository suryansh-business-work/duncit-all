import { useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Controller, type Control, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Card, CardContent, Grid, Stack, TextField, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation, type Translator } from '@duncit/app-settings';
import {
  PUBLIC_GIFT_CARD_SETTINGS,
  UPDATE_GIFT_CARD_SETTINGS,
  type GiftCardSettings,
} from './queries';
import {
  BLANK_GIFT_CARD_SETTINGS,
  giftCardSettingsSchema,
  parseDenominations,
  toGiftCardSettingsForm,
  type GiftCardSettingsForm,
} from './gift-card-settings.schema';

type NumberFieldName = 'min_amount' | 'max_amount' | 'validity_months';

/** Literal keys per field — the localization gate greps for `t('…')`. */
const numberFieldLabels = (t: Translator['t']): Record<NumberFieldName, string> => ({
  min_amount: t('finance.giftCards.minAmountLabel'),
  max_amount: t('finance.giftCards.maxAmountLabel'),
  validity_months: t('finance.giftCards.validityLabel'),
});

const NUMBER_FIELDS: readonly NumberFieldName[] = ['min_amount', 'max_amount', 'validity_months'];

interface NumberFieldProps {
  name: NumberFieldName;
  label: string;
  control: Control<GiftCardSettingsForm>;
}

function PolicyNumberField({ name, label, control }: Readonly<NumberFieldProps>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          label={label}
          required
          fullWidth
          size="small"
          inputMode="numeric"
          error={!!fieldState.error}
          helperText={fieldState.error?.message}
        />
      )}
    />
  );
}

/** Finance > Gift Cards > Dashboard — the sales policy: which amounts the buy
 * page offers, the custom-amount bounds, and how long a card lives. */
export default function GiftCardSettingsCard() {
  const { t } = useTranslation();
  const { data, error, refetch } = useQuery<{ publicGiftCardSettings: GiftCardSettings }>(
    PUBLIC_GIFT_CARD_SETTINGS,
    { fetchPolicy: 'cache-and-network' },
  );
  const [save, { loading: saving }] = useMutation(UPDATE_GIFT_CARD_SETTINGS);

  const schema = useMemo(() => giftCardSettingsSchema(t), [t]);
  const { control, handleSubmit, reset, formState } = useForm<GiftCardSettingsForm>({
    resolver: zodResolver(schema),
    defaultValues: BLANK_GIFT_CARD_SETTINGS,
    mode: 'onBlur',
  });

  const settings = data?.publicGiftCardSettings;
  useEffect(() => {
    if (settings) reset(toGiftCardSettingsForm(settings));
  }, [settings, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      await save({
        variables: {
          input: {
            denominations: parseDenominations(values.denominations),
            min_amount: Number.parseInt(values.min_amount, 10),
            max_amount: Number.parseInt(values.max_amount, 10),
            validity_months: Number.parseInt(values.validity_months, 10),
          },
        },
      });
      await refetch();
      notifySuccess(t('finance.giftCards.settingsSaved'));
    } catch {
      notifyError(t('finance.giftCards.settingsError'));
    }
  });

  const labels = numberFieldLabels(t);

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            mb: 2
          }}>
          <TuneIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" sx={{
            fontWeight: 700
          }}>
            {t('finance.giftCards.settingsTitle')}
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid size={12}>
            <Controller
              name="denominations"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label={t('finance.giftCards.denominationsLabel')}
                  required
                  fullWidth
                  size="small"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ?? t('finance.giftCards.denominationsHint')}
                />
              )}
            />
          </Grid>
          {NUMBER_FIELDS.map((name) => (
            <Grid
              key={name}
              size={{
                xs: 12,
                sm: 4
              }}>
              <PolicyNumberField name={name} label={labels[name]} control={control} />
            </Grid>
          ))}
        </Grid>

        <DuncitButton
          variant="contained"
          disabled={!formState.isDirty || saving}
          sx={{ mt: 2 }}
          onClick={() => {
            submit().catch(() => undefined);
          }}
        >
          {t('finance.giftCards.saveSettings')}
        </DuncitButton>
      </CardContent>
    </Card>
  );
}
