import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { RhfTextField } from '@duncit/forms';
import {
  parsePodPlanFeatures,
  podPlanFormDefaults,
  podPlanFormSchema,
  type PodPlanFormValues,
} from './pod-plan';

export type { PodPlanFormValues } from './pod-plan';

interface Props {
  open: boolean;
  editing: (PodPlanFormValues & { id?: string }) | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: PodPlanFormValues) => Promise<void> | void;
}

const toFormValues = (editing: (PodPlanFormValues & { id?: string }) | null): PodPlanFormValues => {
  if (!editing) return podPlanFormDefaults;
  const { id: _id, ...rest } = editing;
  return rest;
};

export default function PodPlanFormDialog({ open, editing, loading, onClose, onSubmit }: Readonly<Props>) {
  const { control, handleSubmit, reset } = useForm<PodPlanFormValues>({
    defaultValues: toFormValues(editing),
    resolver: zodResolver(podPlanFormSchema),
    mode: 'onTouched',
  });

  useEffect(() => {
    if (open) reset(toFormValues(editing));
    else reset(podPlanFormDefaults);
  }, [open, editing, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit({ ...values, features: values.features.filter((f) => f && f.trim().length > 0) });
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit}>
        <DialogTitle>{editing ? 'Edit plan' : 'New plan'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <RhfTextField
              control={control}
              name="key"
              label="Key"
              hint="e.g. free, premium"
              disabled={!!editing}
              size="small"
              required
            />
            <RhfTextField control={control} name="name" label="Display name" size="small" required />
            <RhfTextField control={control} name="description" label="Description" multiline minRows={2} size="small" />
            <RhfTextField control={control} name="image_url" label="Image URL" size="small" />
            <Controller
              control={control}
              name="features"
              render={({ field }) => (
                <TextField
                  label="Features (one per line)"
                  value={(field.value ?? []).join('\n')}
                  onChange={(event) => field.onChange(parsePodPlanFeatures(event.target.value))}
                  multiline
                  minRows={3}
                  size="small"
                  fullWidth
                />
              )}
            />
            <Stack direction="row" spacing={2}>
              <RhfTextField control={control} name="price_label" label="Price label" size="small" />
              <RhfTextField
                control={control}
                name="sort_order"
                type="number"
                label="Sort order"
                size="small"
                fullWidth={false}
                sx={{ width: 130 }}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <Controller
                control={control}
                name="is_coming_soon"
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={!!field.value} onChange={(_, v) => field.onChange(v)} />}
                    label="Coming soon"
                  />
                )}
              />
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={!!field.value} onChange={(_, v) => field.onChange(v)} />}
                    label="Active"
                  />
                )}
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
