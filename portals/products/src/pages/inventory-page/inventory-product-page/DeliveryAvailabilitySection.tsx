import {
  FormControlLabel,
  Grid,
  InputAdornment,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import RhfNumberField from './RhfNumberField';
import WarehouseSelect from './WarehouseSelect';
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
      <Grid item xs={12} md={6}>
        <WarehouseSelect />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="subtitle2" fontWeight={700}>
          Shipping dimensions
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Package size and weight used by ShipRocket to rate and book couriers.
        </Typography>
      </Grid>
      <Grid item xs={6} md={3}>
        <RhfNumberField control={control} name="length_cm" label="Length" hint="cm" />
      </Grid>
      <Grid item xs={6} md={3}>
        <RhfNumberField control={control} name="breadth_cm" label="Breadth" hint="cm" />
      </Grid>
      <Grid item xs={6} md={3}>
        <RhfNumberField control={control} name="height_cm" label="Height" hint="cm" />
      </Grid>
      <Grid item xs={6} md={3}>
        <RhfNumberField control={control} name="weight_kg" label="Weight" hint="kg" />
      </Grid>
    </Grid>
  );
}
