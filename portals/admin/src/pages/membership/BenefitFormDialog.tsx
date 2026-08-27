import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import {
  buildBenefitValueFields,
  membershipBenefitFormDefaults,
  membershipBenefitFormSchema,
  type MembershipBenefitFormValues,
} from './membership-benefit';
import { useTranslation } from '@duncit/shell';

/** The tiers this row has a cell for, in display order. */
export interface BenefitDialogPlan {
  key: string;
  name: string;
}

interface Props {
  open: boolean;
  editing: (MembershipBenefitFormValues & { id?: string }) | null;
  plans: readonly BenefitDialogPlan[];
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: MembershipBenefitFormValues) => Promise<void> | void;
}

const toFormValues = (
  editing: (MembershipBenefitFormValues & { id?: string }) | null,
  plans: readonly BenefitDialogPlan[]
): MembershipBenefitFormValues => {
  const base = editing ?? membershipBenefitFormDefaults;
  return {
    group: base.group,
    label: base.label,
    // Rebuilt from the PLAN list so a tier added after this row still gets an
    // input rather than an uneditable, permanently-blank column.
    values: buildBenefitValueFields(
      plans.map((p) => p.key),
      base.values ?? []
    ),
    sort_order: base.sort_order,
    is_active: base.is_active,
  };
};

export default function BenefitFormDialog({
  open,
  editing,
  plans,
  loading,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset } = useForm<MembershipBenefitFormValues>({
    defaultValues: toFormValues(editing, plans),
    resolver: zodResolver(membershipBenefitFormSchema),
    mode: 'onTouched',
  });

  useEffect(() => {
    if (open) reset(toFormValues(editing, plans));
    else reset(membershipBenefitFormDefaults);
  }, [open, editing, plans, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit}>
        <DialogTitle>{editing ? 'Edit benefit row' : 'New benefit row'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <RhfTextField
              control={control}
              name="group"
              label={t('admin.membership.section')}
              hint="Rows sharing a section are grouped under it, e.g. Getting a spot"
              size="small"
              required
            />
            <RhfTextField
              control={control}
              name="label"
              label={t('admin.membership.benefit')}
              hint="The row label, e.g. Early booking window"
              size="small"
              required
            />

            <Stack spacing={0.5}>
              <Typography variant="subtitle2" sx={{
                fontWeight: 700
              }}>
                What each tier gets
              </Typography>
              <Alert severity="info" sx={{ py: 0.25 }}>
                Type <strong>✓</strong> for a tick, <strong>—</strong> or blank for a dash, or any
                text to show it as typed (12h, 10%, Free).
              </Alert>
            </Stack>

            {plans.length === 0 && (
              <Alert severity="warning">{t('admin.membership.needTier')}</Alert>
            )}

            {plans.map((plan, index) => (
              <Controller
                key={plan.key}
                control={control}
                name={`values.${index}.value`}
                render={({ field }) => (
                  <TextField
                    label={plan.name}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    size="small"
                    fullWidth
                  />
                )}
              />
            ))}

            <Stack direction="row" spacing={2} sx={{
              alignItems: "center"
            }}>
              <RhfTextField
                control={control}
                name="sort_order"
                type="number"
                label={t('admin.podPlans.sortOrder')}
                hint="Rows and their sections render in this order."
                size="small"
                fullWidth={false}
                sx={{ width: 150 }}
              />
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch checked={!!field.value} onChange={(_, v) => field.onChange(v)} />
                    }
                    label={t('admin.profile.active')}
                  />
                )}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onClose}>{t('shell.common.cancel')}</DuncitButton>
          <DuncitButton type="submit" variant="contained" disabled={loading || plans.length === 0}>
            {editing ? 'Save changes' : 'Create row'}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
