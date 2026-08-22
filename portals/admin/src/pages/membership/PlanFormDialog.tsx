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
} from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import {
  membershipPlanFormDefaults,
  membershipPlanFormSchema,
  type MembershipPlanFormValues,
} from './membership-plan';
import { useTranslation } from '@duncit/shell';

interface Props {
  open: boolean;
  editing: (MembershipPlanFormValues & { id?: string }) | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: MembershipPlanFormValues) => Promise<void> | void;
}

const toFormValues = (
  editing: (MembershipPlanFormValues & { id?: string }) | null
): MembershipPlanFormValues => {
  if (!editing) return membershipPlanFormDefaults;
  const { id: _id, ...rest } = editing;
  return rest;
};

export default function PlanFormDialog({
  open,
  editing,
  loading,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset } = useForm<MembershipPlanFormValues>({
    defaultValues: toFormValues(editing),
    resolver: zodResolver(membershipPlanFormSchema),
    mode: 'onTouched',
  });

  useEffect(() => {
    if (open) reset(toFormValues(editing));
    else reset(membershipPlanFormDefaults);
  }, [open, editing, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit}>
        <DialogTitle>{editing ? 'Edit tier' : 'New tier'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <RhfTextField
              control={control}
              name="key"
              label={t('admin.podPlans.key')}
              hint={
                editing
                  ? 'Locked — every comparison cell references this key.'
                  : 'e.g. access, connect, elite'
              }
              disabled={!!editing}
              size="small"
              required
            />
            <RhfTextField control={control} name="name" label={t('admin.membership.displayName')} size="small" required />
            <RhfTextField
              control={control}
              name="tagline"
              label={t('admin.membership.tagline')}
              hint="One line under the name — who the tier is for."
              multiline
              minRows={2}
              size="small"
            />
            <Stack direction="row" spacing={2}>
              <RhfTextField
                control={control}
                name="price_label"
                label={t('admin.membership.price')}
                hint="Shown as typed, e.g. ₹1,499 or Invite only"
                size="small"
              />
              <RhfTextField
                control={control}
                name="price_note"
                label={t('admin.membership.priceNote')}
                hint="e.g. / year · or ₹199 / mo"
                size="small"
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <RhfTextField
                control={control}
                name="badge_label"
                label={t('admin.membership.badge')}
                hint="Ribbon on the card, e.g. Most popular. Blank hides it."
                size="small"
              />
              <RhfTextField
                control={control}
                name="accent_color"
                label={t('admin.membership.accentColour')}
                hint="Hex, e.g. #B4532A. Blank uses the app primary."
                size="small"
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <RhfTextField
                control={control}
                name="cta_label"
                label={t('admin.membership.buttonText')}
                hint="The button stays disabled while membership is coming soon."
                size="small"
              />
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
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch checked={!!field.value} onChange={(_, v) => field.onChange(v)} />
                  }
                  label={t('admin.membership.activeHint')}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('shell.common.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {editing ? 'Save changes' : 'Create tier'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
