import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Divider, Grid, Stack, Typography } from '@mui/material';
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
  AUDIENCE_OPTIONS,
  PLATFORM_OPTIONS,
} from './app-popup.types';

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
  const { control, handleSubmit, formState } = useForm<AppPopupFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(appPopupSchema),
    mode: 'onChange',
  });

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <form noValidate onSubmit={submit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <RhfTextField
            control={control}
            name="name"
            label="Name"
            required
            hint="Only you see this — it names the popup in this table"
          />
        </Grid>

        <Grid item xs={12}>
          <Controller
            control={control}
            name="image_url"
            render={({ field, fieldState }) => (
              <SingleImageUploadField
                variant="avatar"
                shape="square"
                label="Popup image"
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

        <Grid item xs={12}>
          <Divider />
          <Typography variant="overline" color="text.secondary">
            Schedule & platform
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <PopupScheduleFields control={control} />
        </Grid>

        <Grid item xs={12}>
          <Divider />
          <Typography variant="overline" color="text.secondary">
            Audience & action
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <PopupAudienceFields control={control} audienceLists={audienceLists} />
        </Grid>

        {errorMessage && (
          <Grid item xs={12}>
            <Alert severity="error">{errorMessage}</Alert>
          </Grid>
        )}

        <Grid item xs={12}>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={busy || !formState.isValid}>
              {busy ? 'Saving…' : submitLabel}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </form>
  );
}
