import {
  FormControlLabel,
  Grid,
  InputAdornment,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { useFormikContext } from 'formik';
import type { InventoryProductFormValues } from './types';

const num = (v: any) => (v === '' ? 0 : Number(v));

export default function DeliveryAvailabilitySection() {
  const f = useFormikContext<InventoryProductFormValues>();
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Stack spacing={1}>
          <FormControlLabel
            control={
              <Switch
                checked={f.values.pod_available}
                onChange={(_, v) => f.setFieldValue('pod_available', v)}
              />
            }
            label="Available in pods"
          />
          <FormControlLabel
            control={
              <Switch
                checked={f.values.host_request_allowed}
                onChange={(_, v) => f.setFieldValue('host_request_allowed', v)}
              />
            }
            label="Hosts can request this"
          />
          <FormControlLabel
            control={
              <Switch
                checked={f.values.delivery_available}
                onChange={(_, v) => f.setFieldValue('delivery_available', v)}
              />
            }
            label="Delivery available"
          />
        </Stack>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          name="delivery_charge"
          label="Delivery charge"
          type="number"
          disabled={!f.values.delivery_available}
          value={f.values.delivery_charge}
          onChange={(e) => f.setFieldValue('delivery_charge', num(e.target.value))}
          helperText={
            f.values.delivery_available
              ? 'Flat fee per order; set 0 for free delivery'
              : 'Enable "Delivery available" to set a charge'
          }
          InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
        />
      </Grid>
    </Grid>
  );
}
