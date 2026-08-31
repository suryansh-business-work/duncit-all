import { Controller, useForm , type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Divider, Grid, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { SingleImageUploadField } from '@duncit/media-picker';
import {
  appPopupSchema,
  type AppPopupFormProps,
  type AppPopupFormValues,
} from './app-popup.types';
import PopupScheduleFields from './PopupScheduleFields';
import PopupAudienceFields from './PopupAudienceFields';

export {
  appPopupSchema,
  blankAppPopupValues,
  toAppPopupInput,
  toAppPopupValues,
  audienceOptions,
  platformOptions,
} from './app-popup.types';
import { useTranslation } from '@duncit/app-settings';

/** The image is the popup — everything else only decides who sees it and when. */
export default function AppPopupForm({
  audienceLists,
  initialValues,
  busy,
  errorMessage,
  submitLabel,
  onCancel,
  onSubmit,
}: Readonly<AppPopupFormProps>) {
  const { t } = useTranslation();
  const { control, handleSubmit, formState } = useForm<AppPopupFormValues, any, AppPopupFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(appPopupSchema(t)) as unknown as Resolver<AppPopupFormValues, any, AppPopupFormValues>,
    mode: 'onChange',
  });

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <form noValidate onSubmit={submit}>
      <Grid container spacing={2}>
        <Grid size={12}>
          <RhfTextField
            control={control}
            name="name"
            label={t('shell.common.name')}
            required
            hint="Only you see this — it names the popup in this table"
          />
        </Grid>

        <Grid size={12}>
          <Controller
            control={control}
            name="image_url"
            render={({ field, fieldState }) => (
              <SingleImageUploadField
                variant="avatar"
                shape="square"
                label={t('marketing.appPopups.popupImage')}
                value={field.value}
                onChange={field.onChange}
                folder="/app-popups"
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? 'Shown full-width when the app opens'}
                uploadTestId="upload-popup-image"
              />
            )}
          />
        </Grid>

        <Grid size={12}>
          <Divider />
          <Typography variant="overline" sx={{
            color: "text.secondary"
          }}>
            Schedule & platform
          </Typography>
        </Grid>
        <Grid size={12}>
          <PopupScheduleFields control={control} />
        </Grid>

        <Grid size={12}>
          <Divider />
          <Typography variant="overline" sx={{
            color: "text.secondary"
          }}>
            Audience & action
          </Typography>
        </Grid>
        <Grid size={12}>
          <PopupAudienceFields control={control} audienceLists={audienceLists} />
        </Grid>

        {errorMessage && (
          <Grid size={12}>
            <Alert severity="error">{errorMessage}</Alert>
          </Grid>
        )}

        <Grid size={12}>
          <Stack direction="row" spacing={1} sx={{
            justifyContent: "flex-end"
          }}>
            <DuncitButton onClick={onCancel} disabled={busy}>
              Cancel
            </DuncitButton>
            <DuncitButton type="submit" variant="contained" disabled={busy || !formState.isValid}>
              {busy ? 'Saving…' : submitLabel}
            </DuncitButton>
          </Stack>
        </Grid>
      </Grid>
    </form>
  );
}
