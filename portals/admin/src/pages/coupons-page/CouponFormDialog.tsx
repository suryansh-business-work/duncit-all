import { useMutation } from '@apollo/client';
import { useFormik } from 'formik';
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
  TextField,
} from '@mui/material';
import {
  couponFormDefaults,
  couponFormSchema,
  toCouponInput,
  type CouponFormValues,
} from './coupon';
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

export default function CouponFormDialog({ open, onClose, onSaved, initial, lockedPod, pods }: Readonly<Props>) {
  const [createCoupon] = useMutation(CREATE_COUPON);
  const [updateCoupon] = useMutation(UPDATE_COUPON);

  const formik = useFormik<CouponFormValues>({
    enableReinitialize: true,
    initialValues: initial
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
      : { ...couponFormDefaults, ...(lockedPod ? { scope: 'POD', pod_id: lockedPod.id } : {}) },
    validationSchema: couponFormSchema,
    onSubmit: async (values, helpers) => {
      try {
        const input = toCouponInput(values);
        if (initial) await updateCoupon({ variables: { id: initial.id, input } });
        else await createCoupon({ variables: { input } });
        onSaved();
        onClose();
      } catch (error) {
        helpers.setStatus((error as Error)?.message ?? 'Could not save coupon');
      }
    },
  });
  const { values, errors, touched, handleChange, handleBlur, setFieldValue, submitForm, status } = formik;
  const field = (name: keyof typeof values) => ({
    name,
    value: (values[name] ?? '') as string | number,
    onChange: handleChange,
    onBlur: handleBlur,
    error: touched[name] && !!errors[name],
    helperText: touched[name] ? (errors[name] as string) : undefined,
    fullWidth: true,
    size: 'small' as const,
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? 'Edit coupon' : 'New coupon'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {status && <Alert severity="error">{status}</Alert>}
          <TextField label="Code" {...field('code')} inputProps={{ style: { textTransform: 'uppercase' } }} />
          <TextField label="Description" {...field('description')} multiline minRows={2} />
          <Stack direction="row" spacing={2}>
            <TextField type="number" label="Discount %" {...field('discount_pct')} />
            <TextField type="number" label="Min order ₹" {...field('min_order_amount')} />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField select label="Scope" {...field('scope')} disabled={!!lockedPod}>
              <MenuItem value="GLOBAL">Global (all pods)</MenuItem>
              <MenuItem value="POD">Pod-specific</MenuItem>
            </TextField>
            {values.scope === 'POD' && (
              <TextField
                select
                label="Pod"
                {...field('pod_id')}
                disabled={!!lockedPod}
              >
                {lockedPod ? (
                  <MenuItem value={lockedPod.id}>{lockedPod.title}</MenuItem>
                ) : (
                  pods.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.title}
                    </MenuItem>
                  ))
                )}
              </TextField>
            )}
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField type="date" label="Valid from" InputLabelProps={{ shrink: true }} {...field('valid_from')} />
            <TextField type="date" label="Valid until" InputLabelProps={{ shrink: true }} {...field('valid_until')} />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField type="number" label="Max total uses" {...field('max_uses')} />
            <TextField type="number" label="Per-user limit" {...field('per_user_limit')} />
          </Stack>
          <FormControlLabel
            control={
              <Switch
                checked={values.is_active}
                onChange={(e) => setFieldValue('is_active', e.target.checked)}
              />
            }
            label="Active"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submitForm}>
          {initial ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
