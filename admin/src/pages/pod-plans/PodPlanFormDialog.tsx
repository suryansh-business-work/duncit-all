import { useEffect } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from '@mui/material';

export interface PodPlanFormValues {
  key: string;
  name: string;
  description: string;
  image_url: string;
  features: string[];
  price_label: string;
  is_coming_soon: boolean;
  sort_order: number;
  is_active: boolean;
}

const empty: PodPlanFormValues = {
  key: '',
  name: '',
  description: '',
  image_url: '',
  features: [],
  price_label: '',
  is_coming_soon: false,
  sort_order: 0,
  is_active: true,
};

const schema = yup.object({
  key: yup
    .string()
    .matches(/^[a-z0-9_-]+$/, 'Lowercase letters, digits, dash or underscore only')
    .required('Key is required'),
  name: yup.string().min(1).max(80).required('Name is required'),
  description: yup.string().max(500),
  image_url: yup.string().url('Must be a valid URL').nullable(),
  features: yup.array().of(yup.string().required()).max(20),
  price_label: yup.string().max(60),
  sort_order: yup.number().integer().min(0).max(999).required(),
  is_coming_soon: yup.boolean(),
  is_active: yup.boolean(),
});

interface Props {
  open: boolean;
  editing: (PodPlanFormValues & { id?: string }) | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: PodPlanFormValues) => Promise<void> | void;
}

export default function PodPlanFormDialog({
  open,
  editing,
  loading,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  const formik = useFormik<PodPlanFormValues>({
    initialValues: editing ?? empty,
    enableReinitialize: true,
    validationSchema: schema,
    onSubmit: async (values) => {
      await onSubmit({
        ...values,
        features: values.features.filter((f) => f && f.trim().length > 0),
      });
    },
  });

  useEffect(() => {
    if (!open) formik.resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const featuresText = (formik.values.features ?? []).join('\n');

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={formik.handleSubmit}>
        <DialogTitle>{editing ? 'Edit plan' : 'New plan'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Key"
              name="key"
              value={formik.values.key}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.key && Boolean(formik.errors.key)}
              helperText={(formik.touched.key && formik.errors.key) || 'e.g. free, premium'}
              disabled={!!editing}
              size="small"
            />
            <TextField
              label="Display name"
              name="name"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
              size="small"
            />
            <TextField
              label="Description"
              name="description"
              value={formik.values.description}
              onChange={formik.handleChange}
              multiline
              minRows={2}
              size="small"
            />
            <TextField
              label="Image URL"
              name="image_url"
              value={formik.values.image_url}
              onChange={formik.handleChange}
              error={Boolean(formik.errors.image_url)}
              helperText={formik.errors.image_url as string | undefined}
              size="small"
            />
            <TextField
              label="Features (one per line)"
              value={featuresText}
              onChange={(e) =>
                formik.setFieldValue(
                  'features',
                  e.target.value.split('\n').map((s) => s.trim())
                )
              }
              multiline
              minRows={3}
              size="small"
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Price label"
                name="price_label"
                value={formik.values.price_label}
                onChange={formik.handleChange}
                size="small"
                fullWidth
              />
              <TextField
                label="Sort order"
                name="sort_order"
                type="number"
                value={formik.values.sort_order}
                onChange={formik.handleChange}
                size="small"
                sx={{ width: 130 }}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formik.values.is_coming_soon}
                    onChange={(_, v) => formik.setFieldValue('is_coming_soon', v)}
                  />
                }
                label="Coming soon"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formik.values.is_active}
                    onChange={(_, v) => formik.setFieldValue('is_active', v)}
                  />
                }
                label="Active"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {editing ? 'Save changes' : 'Create plan'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
