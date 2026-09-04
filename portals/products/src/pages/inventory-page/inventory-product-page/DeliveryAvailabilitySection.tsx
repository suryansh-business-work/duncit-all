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
import DeliveryTargetSelect from './DeliveryTargetSelect';
import WarehouseSelect from './WarehouseSelect';
import type { InventoryProductFormValues } from './types';
import { useTranslation } from '@duncit/shell';

type SwitchName = 'pod_available' | 'host_request_allowed' | 'delivery_available';

type Translate = ReturnType<typeof useTranslation>['t'];

const switches = (t: Translate): { name: SwitchName; label: string }[] => [
  { name: 'pod_available', label: t('products.delivery.availableInPods') },
  { name: 'host_request_allowed', label: t('products.delivery.hostsCanRequest') },
  { name: 'delivery_available', label: t('products.delivery.deliveryAvailable') },
];

export default function DeliveryAvailabilitySection() {
  const { t } = useTranslation();
  const { control } = useFormContext<InventoryProductFormValues>();
  const deliveryAvailable = useWatch({ control, name: 'delivery_available' });
  const ownership = useWatch({ control, name: 'ownership' });
  const shiprocket = useWatch({ control, name: 'delivery_target' }) === 'SHIPROCKET';
  // On ShipRocket the live warehouse rate is what the buyer pays, so this
  // number is only the fallback when the lane cannot be rated — saying
  // "flat fee" there is what has admins leaving it at 0.
  let chargeHint = 'Enable "Delivery available" to set a charge';
  if (deliveryAvailable && shiprocket) chargeHint = t('products.delivery.chargeFallbackHint');
  else if (deliveryAvailable) chargeHint = 'Flat fee per order; set 0 for free delivery';

  return (
    <Grid container spacing={2}>
      <Grid
        size={{
          xs: 12,
          md: 6
        }}>
        <Stack spacing={1}>
          {switches(t).map((sw) => (
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
      <Grid
        size={{
          xs: 12,
          md: 6
        }}>
        <RhfNumberField
          control={control}
          name="delivery_charge"
          label={t('products.delivery.charge')}
          disabled={!deliveryAvailable}
          hint={chargeHint}
          slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }}
        />
      </Grid>
      {/* Duncit products only — a brand product keeps the delivery method and
          warehouse it was listed with, neither of which this form manages. */}
      {ownership === 'DUNCIT' && (
        <>
          <Grid
            size={{
              xs: 12,
              md: 6
            }}>
            <DeliveryTargetSelect />
          </Grid>
          <Grid
            size={{
              xs: 12,
              md: 6
            }}>
            <WarehouseSelect />
          </Grid>
        </>
      )}
      <Grid size={12}>
        <Typography variant="subtitle2" sx={{
          fontWeight: 700
        }}>
          Shipping dimensions
        </Typography>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          Package size and weight used by ShipRocket to rate and book couriers.
        </Typography>
      </Grid>
      <Grid
        size={{
          xs: 6,
          md: 3
        }}>
        <RhfNumberField control={control} name="length_cm" label={t('products.delivery.length')} hint="cm" />
      </Grid>
      <Grid
        size={{
          xs: 6,
          md: 3
        }}>
        <RhfNumberField control={control} name="breadth_cm" label={t('products.delivery.breadth')} hint="cm" />
      </Grid>
      <Grid
        size={{
          xs: 6,
          md: 3
        }}>
        <RhfNumberField control={control} name="height_cm" label={t('products.delivery.height')} hint="cm" />
      </Grid>
      <Grid
        size={{
          xs: 6,
          md: 3
        }}>
        <RhfNumberField control={control} name="weight_kg" label={t('products.delivery.weight')} hint="kg" />
      </Grid>
    </Grid>
  );
}
