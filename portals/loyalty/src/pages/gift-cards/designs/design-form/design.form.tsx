import { useEffect, useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Autocomplete, Card, CardContent, Grid, Stack, TextField } from '@mui/material';
import { MediaPickerField } from '@duncit/media-picker';
import { RhfTextField } from '@duncit/forms';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import DesignFlipPreview from '../DesignFlipPreview';
import {
  DESIGN_LIMITS,
  makeDesignSchema,
  toDesignInput,
  toDesignValues,
  type DesignFormProps,
  type DesignFormValues,
} from './design.types';

const UPLOAD_FOLDER = '/loyalty/gift-card-designs';

/**
 * Add or edit one catalogue design: its name, the internal category it is filed
 * under, and the front and back artwork — previewed live, flippable, exactly as
 * members will see it.
 */
export default function DesignForm({
  design,
  categories,
  busy,
  readOnly = false,
  errorMessage,
  onSubmit,
  onCancel,
}: Readonly<DesignFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeDesignSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<DesignFormValues>({
    defaultValues: toDesignValues(design),
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });
  useEffect(() => reset(toDesignValues(design)), [design, reset]);
  const [front, back] = useWatch({ control, name: ['front_image_url', 'back_image_url'] });
  const pickerLabels = {
    placeholder: t('loyalty.designs.mediaHint'),
    pick: t('loyalty.designs.mediaPick'),
    open: t('loyalty.designs.mediaOpen'),
  };

  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(toDesignInput(values)))} data-testid="design-form">
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
                <RhfTextField
                  control={control}
                  name="name"
                  label={t('loyalty.designs.nameLabel')}
                  required
                  slotProps={{ htmlInput: { maxLength: DESIGN_LIMITS.name } }}
                  data-testid="design-name"
                />
                <Controller
                  control={control}
                  name="category"
                  render={({ field, fieldState }) => (
                    <Autocomplete
                      freeSolo
                      options={categories as string[]}
                      value={field.value}
                      onInputChange={(_e, value) => field.onChange(value)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={t('loyalty.designs.categoryLabel')}
                          helperText={fieldState.error?.message ?? t('loyalty.designs.categoryHint')}
                          error={!!fieldState.error}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                  )}
                />
                {(['front_image_url', 'back_image_url'] as const).map((name) => (
                  <Controller
                    key={name}
                    control={control}
                    name={name}
                    render={({ field, fieldState }) => (
                      <MediaPickerField
                        label={name === 'front_image_url' ? t('loyalty.designs.frontLabel') : t('loyalty.designs.backLabel')}
                        value={field.value}
                        onChange={field.onChange}
                        labels={pickerLabels}
                        folder={UPLOAD_FOLDER}
                        accept="image/*"
                        required
                        showPreview={false}
                        helperText={fieldState.error?.message ?? t('loyalty.designs.artworkHint')}
                      />
                    )}
                  />
                ))}
                <RhfTextField
                  control={control}
                  name="sort_order"
                  label={t('loyalty.designs.sortOrderLabel')}
                  hint={t('loyalty.designs.sortOrderHint')}
                  inputMode="numeric"
                  data-testid="design-sort-order"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined">
            <CardContent>
              <DesignFlipPreview front={front} back={back} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={12} sx={{ display: readOnly ? 'none' : undefined }}>
          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
            <DuncitButton onClick={onCancel} disabled={busy}>
              {t('loyalty.designs.cancel')}
            </DuncitButton>
            <DuncitButton type="submit" variant="contained" loading={busy} data-testid="design-save">
              {design ? t('loyalty.designs.save') : t('loyalty.designs.create')}
            </DuncitButton>
          </Stack>
        </Grid>
      </Grid>
    </form>
  );
}
