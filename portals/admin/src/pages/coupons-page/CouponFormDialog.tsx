import { useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
} from '@mui/material';
import RhfTextField from '../../forms/components/RhfTextField';
import { couponFormDefaults, couponFormSchema, toCouponInput, type CouponFormValues } from './coupon';
import { CREATE_COUPON, UPDATE_COUPON, type CouponRow } from './queries';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: CouponRow | null;
  lockedPod?: { id: string; title: string } | null;
  pods: { id: string; title: string }[];
}

const toDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');

const buildDefaults = (
  initial?: CouponRow | null,
  lockedPod?: { id: string; title: string } | null,
): CouponFormValues =>
  initial
    ? {
        code: initial.code,
        description: initial.description,
        discount_pct: initial.discount_pct,
        scope: initial.scope,
        pod_id: initial.pod_id ?? '',
        valid_from: toDateInput(initial.valid_from),
        valid_until: toDateInput(initial.valid_until),
        max_uses: initial.max_uses,
        per_user_limit: initial.per_user_limit,
        min_order_amount: initial.min_order_amount,
        is_active: initial.is_active,
      }
    : { ...couponFormDefaults, ...(lockedPod ? { scope: 'POD', pod_id: lockedPod.id } : {}) };

export default function CouponFormDialog({ open, onClose, onSaved, initial, lockedPod, pods }: Readonly<Props>) {
  const [createCoupon] = useMutation(CREATE_COUPON);
  const [updateCoupon] = useMutation(UPDATE_COUPON);

  const { control, handleSubmit, watch, reset, setError, formState } = useForm<CouponFormValues>({
    defaultValues: buildDefaults(initial, lockedPod),
    resolver: zodResolver(couponFormSchema),
    mode: 'onTouched',
  });

  useEffect(() => {
    reset(buildDefaults(initial, lockedPod));
  }, [initial, lockedPod, reset]);

  const scope = watch('scope');
  const status = formState.errors.root?.message;

  const submit = handleSubmit(async (values) => {
    try {
      const input = toCouponInput(values);
      if (initial) await updateCoupon({ variables: { id: initial.id, input } });
      else await createCoupon({ variables: { input } });
      onSaved();
      onClose();
    } catch (error) {
      setError('root', { message: (error as Error)?.message ?? 'Could not save coupon' });
    }
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? 'Edit coupon' : 'New coupon'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {status && <Alert severity="error">{status}</Alert>}
          <RhfTextField
            control={control}
            name="code"
            label="Code"
            size="small"
            inputProps={{ style: { textTransform: 'uppercase' } }}
          />
          <RhfTextField control={control} name="description" label="Description" size="small" multiline minRows={2} />
          <Stack direction="row" spacing={2}>
            <RhfTextField control={control} name="discount_pct" type="number" label="Discount %" size="small" />
            <RhfTextField control={control} name="min_order_amount" type="number" label="Min order ₹" size="small" />
          </Stack>
          <Stack direction="row" spacing={2}>
            <RhfTextField control={control} name="scope" select label="Scope" size="small" disabled={!!lockedPod}>
              <MenuItem value="GLOBAL">Global (all pods)</MenuItem>
              <MenuItem value="POD">Pod-specific</MenuItem>
            </RhfTextField>
            {scope === 'POD' && (
              <RhfTextField control={control} name="pod_id" select label="Pod" size="small" disabled={!!lockedPod}>
                {lockedPod ? (
                  <MenuItem value={lockedPod.id}>{lockedPod.title}</MenuItem>
                ) : (
                  pods.map((pod) => (
                    <MenuItem key={pod.id} value={pod.id}>
                      {pod.title}
                    </MenuItem>
                  ))
                )}
              </RhfTextField>
            )}
          </Stack>
          <Stack direction="row" spacing={2}>
            <RhfTextField
              control={control}
              name="valid_from"
              type="date"
              label="Valid from"
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <RhfTextField
              control={control}
              name="valid_until"
              type="date"
              label="Valid until"
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
          <Stack direction="row" spacing={2}>
            <RhfTextField control={control} name="max_uses" type="number" label="Max total uses" size="small" />
            <RhfTextField control={control} name="per_user_limit" type="number" label="Per-user limit" size="small" />
          </Stack>
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={!!field.value} onChange={(event) => field.onChange(event.target.checked)} />}
                label="Active"
              />
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit}>
          {initial ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
