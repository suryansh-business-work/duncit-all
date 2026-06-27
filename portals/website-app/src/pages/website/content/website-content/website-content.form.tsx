import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, DialogActions, FormControlLabel, Stack, Switch } from '@mui/material';
import DateTimeField from '../../../../components/DateTimeField';
import ImageField from '../../../../components/ImageField';
import RhfTextField from '../../../../forms/components/RhfTextField';
import type { WebsiteContentItem, WebsitePageType } from '../queries';
import {
  blankValues,
  toContentInput,
  toFormValues,
  websiteContentSchema,
  type WebsiteContentFormValues,
  type WebsiteContentInput,
} from './website-content.types';

interface Props {
  type: WebsitePageType;
  item: WebsiteContentItem | null;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (input: WebsiteContentInput) => void;
  onCancel: () => void;
}

export default function WebsiteContentForm({ type, item, submitting, errorMessage, onSubmit, onCancel }: Readonly<Props>) {
  const { control, handleSubmit } = useForm<WebsiteContentFormValues>({
    defaultValues: item ? toFormValues(item) : blankValues(),
    resolver: zodResolver(websiteContentSchema),
    mode: 'onTouched',
  });

  const submit = handleSubmit((values) => onSubmit(toContentInput(values, type)));

  return (
    <form onSubmit={submit} noValidate>
      <Stack spacing={2} sx={{ mt: 1 }}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <RhfTextField control={control} name="title" label="Title" required />
          <RhfTextField
            control={control}
            name="sort_order"
            label="Sort order"
            type="number"
            sx={{ maxWidth: { sm: 160 } }}
          />
        </Stack>
        <RhfTextField
          control={control}
          name="slug"
          label="Slug"
          hint="Leave blank to generate from the title."
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <RhfTextField control={control} name="category" label="Category / Team" />
          <Controller
            control={control}
            name="published_at"
            render={({ field }) => (
              <DateTimeField label="Published at" value={field.value ?? ''} onChange={field.onChange} />
            )}
          />
        </Stack>
        <RhfTextField control={control} name="summary" label="Summary" multiline minRows={2} />
        <RhfTextField control={control} name="body" label="Body" multiline minRows={5} />
        <Controller
          control={control}
          name="image_url"
          render={({ field, fieldState }) => (
            <ImageField
              label="Image"
              value={field.value ?? ''}
              onChange={field.onChange}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <RhfTextField control={control} name="cta_label" label="CTA label" />
          <RhfTextField control={control} name="cta_url" label="CTA URL" />
        </Stack>
        <Controller
          control={control}
          name="is_published"
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
              label="Published"
            />
          )}
        />
      </Stack>
      <DialogActions sx={{ px: 0, pt: 2 }}>
        <Button onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </form>
  );
}
