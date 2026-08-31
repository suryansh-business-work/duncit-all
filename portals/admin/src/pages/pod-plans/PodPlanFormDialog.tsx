import { useEffect } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import {
  parsePodPlanFeatures,
  podPlanFormDefaults,
  podPlanFormSchema,
  type PodPlanFormValues,
} from './pod-plan';
import { useTranslation } from '@duncit/shell';

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
  const { t } = useTranslation();
  const { control, handleSubmit, reset } = useForm<PodPlanFormValues, any, PodPlanFormValues>({
    defaultValues: toFormValues(editing),
    resolver: zodResolver(podPlanFormSchema) as unknown as Resolver<PodPlanFormValues, any, PodPlanFormValues>,
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
              label={t('admin.podPlans.key')}
              hint="e.g. free, premium"
              disabled={!!editing}
              size="small"
              required
            />
            <RhfTextField control={control} name="name" label={t('admin.podPlans.displayName')} size="small" required />
            <RhfTextField control={control} name="description" label={t('shell.common.description')} multiline minRows={2} size="small" />
            <RhfTextField control={control} name="image_url" label={t('admin.podPlans.imageUrl')} size="small" />
            <Controller
              control={control}
              name="features"
              render={({ field }) => (
                <TextField
                  label={t('admin.podPlans.featuresField')}
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
              <RhfTextField control={control} name="price_label" label={t('admin.podPlans.priceLabel')} size="small" />
              <RhfTextField
                control={control}
                name="sort_order"
                type="number"
                label={t('admin.podPlans.sortOrder')}
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
                    label={t('admin.podPlans.comingSoon')}
                  />
                )}
              />
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={!!field.value} onChange={(_, v) => field.onChange(v)} />}
                    label={t('admin.profile.active')}
                  />
                )}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onClose}>{t('shell.common.cancel')}</DuncitButton>
          <DuncitButton type="submit" variant="contained" disabled={loading}>
            {editing ? 'Save changes' : 'Create plan'}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
