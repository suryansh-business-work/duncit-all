import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Card, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useProductVisibility, useTranslation } from '@duncit/app-settings';
import MediaPickerField from '../../../components/MediaPickerField';
import { earnCardImagesSchema, type EarnCardImagesValues } from './earn-card-images.types';

interface Props {
  defaultValues: EarnCardImagesValues;
  saving: boolean;
  onSubmit: (values: EarnCardImagesValues) => void;
}

interface CardField {
  key: keyof EarnCardImagesValues;
  /** Written out in full: the translation gate only sees literal keys. */
  labelKey: string;
}

/** The product-seller card follows `is_product_visible` like the rest of e-commerce. */
const PRODUCT_CARD: keyof EarnCardImagesValues = 'ecomm';

const FIELDS: readonly CardField[] = [
  { key: 'host', labelKey: 'onboarding.earnConfigPage.host' },
  { key: 'venue', labelKey: 'onboarding.earnConfigPage.venue' },
  { key: PRODUCT_CARD, labelKey: 'onboarding.earnConfigPage.ecomm' },
  { key: 'club', labelKey: 'onboarding.earnConfigPage.club' },
  { key: 'freelancer', labelKey: 'onboarding.earnConfigPage.freelancer' },
];

/** One featured image per Earn with Duncit card (mWeb, native and the Partners
 * portal). A cleared image falls back to Duncit's default. The product card is
 * drawn only while products are visible; its stored image still rides along in
 * the form values, so a save with the flag off never clears it. */
export default function EarnCardImagesForm({ defaultValues, saving, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { visible: showEcomm } = useProductVisibility();
  const fields = showEcomm ? FIELDS : FIELDS.filter((item) => item.key !== PRODUCT_CARD);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<EarnCardImagesValues>({
    resolver: zodResolver(earnCardImagesSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <Stack spacing={3} component="form" onSubmit={handleSubmit(onSubmit)}>
      <Alert severity="info">{t('onboarding.earnConfigPage.hint')}</Alert>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        {fields.map((item) => (
          <Card key={item.key} variant="outlined" sx={{ p: 2 }} data-testid={`earn-card-image-${item.key}`}>
            <Controller
              name={item.key}
              control={control}
              render={({ field, fieldState }) => (
                <MediaPickerField
                  label={t(item.labelKey)}
                  value={field.value}
                  onChange={field.onChange}
                  folder="/onboarding/earn-cards"
                  accept="image/*"
                  helperText={fieldState.error?.message ? t(fieldState.error.message) : undefined}
                />
              )}
            />
          </Card>
        ))}
      </Box>
      <DuncitButton type="submit" variant="contained" disabled={saving || !isDirty} sx={{ alignSelf: 'flex-start' }}>
        {saving ? t('shell.common.saving') : t('shell.common.save')}
      </DuncitButton>
    </Stack>
  );
}
