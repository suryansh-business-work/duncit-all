import { Alert, Button, DialogActions, FormControlLabel, Stack, Switch, TextField } from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import DateTimeField from '../../../../components/DateTimeField';
import ImageField from '../../../../components/ImageField';
import type { WebsiteContentItem, WebsitePageType } from '../queries';
import type { WebsiteContentFormValues, WebsiteContentInput } from './website-content.types';

const linkSchema = yup
  .string()
  .trim()
  .test('link', 'Use a valid URL, mailto, or tel link', (value) => {
    if (!value) return true;
    if (/^(mailto:|tel:)/i.test(value)) return true;
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  });

export const websiteContentSchema = yup.object({
  title: yup.string().trim().required('Title is required').max(160, 'Title must be 160 characters or fewer'),
  slug: yup.string().trim().max(180, 'Slug must be 180 characters or fewer'),
  summary: yup.string().trim().max(500, 'Summary must be 500 characters or fewer'),
  body: yup.string().max(50_000, 'Body is too long'),
  category: yup.string().trim().max(80, 'Category must be 80 characters or fewer'),
  image_url: linkSchema,
  cta_label: yup.string().trim().max(60, 'CTA label must be 60 characters or fewer'),
  cta_url: linkSchema,
  published_at: yup.string().nullable(),
  is_published: yup.boolean().required(),
  sort_order: yup
    .number()
    .typeError('Sort order must be a number')
    .integer('Sort order must be a whole number')
    .min(0, 'Sort order must be 0 or greater')
    .max(9999, 'Sort order is too large')
    .required('Sort order is required'),
});

export const blankValues = (): WebsiteContentFormValues => ({
  title: '',
  slug: '',
  summary: '',
  body: '',
  category: '',
  image_url: '',
  cta_label: '',
  cta_url: '',
  published_at: new Date().toISOString(),
  is_published: true,
  sort_order: 0,
});

export const toFormValues = (item: WebsiteContentItem): WebsiteContentFormValues => ({
  title: item.title ?? '',
  slug: item.slug ?? '',
  summary: item.summary ?? '',
  body: item.body ?? '',
  category: item.category ?? '',
  image_url: item.image_url ?? '',
  cta_label: item.cta_label ?? '',
  cta_url: item.cta_url ?? '',
  published_at: item.published_at ? new Date(item.published_at).toISOString() : '',
  is_published: item.is_published !== false,
  sort_order: item.sort_order ?? 0,
});

export const toContentInput = (
  values: WebsiteContentFormValues,
  type: WebsitePageType,
): WebsiteContentInput => ({
  type,
  title: values.title,
  slug: values.slug || undefined,
  summary: values.summary,
  body: values.body,
  category: values.category,
  image_url: values.image_url,
  cta_label: values.cta_label,
  cta_url: values.cta_url,
  published_at: values.published_at ? new Date(values.published_at).toISOString() : null,
  is_published: values.is_published,
  sort_order: Number(values.sort_order) || 0,
});

interface Props {
  type: WebsitePageType;
  item: WebsiteContentItem | null;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (input: WebsiteContentInput) => void;
  onCancel: () => void;
}

export default function WebsiteContentForm({ type, item, submitting, errorMessage, onSubmit, onCancel }: Readonly<Props>) {
  const formik = useFormik<WebsiteContentFormValues>({
    initialValues: item ? toFormValues(item) : blankValues(),
    validationSchema: websiteContentSchema,
    enableReinitialize: true,
    onSubmit: (values) => onSubmit(toContentInput(values, type)),
  });

  const fieldProps = (name: keyof WebsiteContentFormValues) => ({
    name,
    value: formik.values[name] as string | number,
    onChange: formik.handleChange,
    onBlur: formik.handleBlur,
    error: Boolean(formik.touched[name] && formik.errors[name]),
    helperText: (formik.touched[name] && formik.errors[name]) as string | undefined,
  });

  return (
    <form onSubmit={formik.handleSubmit} noValidate>
      <Stack spacing={2} sx={{ mt: 1 }}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Title" required fullWidth {...fieldProps('title')} />
          <TextField label="Sort order" type="number" sx={{ maxWidth: { sm: 160 } }} {...fieldProps('sort_order')} />
        </Stack>
        <TextField
          label="Slug"
          fullWidth
          {...fieldProps('slug')}
          helperText={
            (formik.touched.slug && formik.errors.slug) || 'Leave blank to generate from the title.'
          }
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Category / Team" fullWidth {...fieldProps('category')} />
          <DateTimeField
            label="Published at"
            value={formik.values.published_at}
            onChange={(iso) => formik.setFieldValue('published_at', iso)}
          />
        </Stack>
        <TextField label="Summary" multiline minRows={2} fullWidth {...fieldProps('summary')} />
        <TextField label="Body" multiline minRows={5} fullWidth {...fieldProps('body')} />
        <ImageField
          label="Image"
          value={formik.values.image_url}
          onChange={(url) => formik.setFieldValue('image_url', url)}
          error={Boolean(formik.touched.image_url && formik.errors.image_url)}
          helperText={(formik.touched.image_url && formik.errors.image_url) as string | undefined}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="CTA label" fullWidth {...fieldProps('cta_label')} />
          <TextField label="CTA URL" fullWidth {...fieldProps('cta_url')} />
        </Stack>
        <FormControlLabel
          control={
            <Switch
              name="is_published"
              checked={formik.values.is_published}
              onChange={formik.handleChange}
            />
          }
          label="Published"
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
