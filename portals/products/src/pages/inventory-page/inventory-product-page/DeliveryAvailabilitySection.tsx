import {
  FormControlLabel,
  Grid,
  InputAdornment,
  Stack,
  Switch,
} from '@mui/material';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import RhfNumberField from './RhfNumberField';
import type { InventoryProductFormValues } from './types';

type SwitchName = 'pod_available' | 'host_request_allowed' | 'delivery_available';

const SWITCHES: { name: SwitchName; label: string }[] = [
  { name: 'pod_available', label: 'Available in pods' },
  { name: 'host_request_allowed', label: 'Hosts can request this' },
  { name: 'delivery_available', label: 'Delivery available' },
];

export default function DeliveryAvailabilitySection() {
  const { control } = useFormContext<InventoryProductFormValues>();
  const deliveryAvailable = useWatch({ control, name: 'delivery_available' });
  const chargeHint = deliveryAvailable
    ? 'Flat fee per order; set 0 for free delivery'
    : 'Enable "Delivery available" to set a charge';

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Stack spacing={1}>
          {SWITCHES.map((sw) => (
            <Controller
              key={sw.name}
              control={control}
              name={sw.name}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!field.value}
                      onChange={(_, value) => field.onChange(value)}
                    />
                  }
                  label={sw.label}
                />
              )}
            />
          ))}
        </Stack>
      </Grid>
      <Grid item xs={12} md={6}>
        <RhfNumberField
          control={control}
          name="delivery_charge"
          label="Delivery charge"
          disabled={!deliveryAvailable}
          hint={chargeHint}
          InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
        />
      </Grid>
    </Grid>
  );
}
