import {
  Alert,
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Slider,
  Stack,
  Typography,
} from '@mui/material';
import { Controller, type Control, type UseFormSetValue, type UseFormWatch } from 'react-hook-form';
import { RhfTextField } from '@duncit/forms';
import type { ProductListingValues } from './list-products.types';
import CategoryRows from './CategoryRows';
import VariantTabs from './VariantTabs';

interface StepProps {
  step: number;
  control: Control<ProductListingValues>;
  watch: UseFormWatch<ProductListingValues>;
  setValue: UseFormSetValue<ProductListingValues>;
  onPickImage: (index: number) => void;
}

export function StepBody({ step, control, watch, setValue, onPickImage }: Readonly<StepProps>) {
  if (step === 0) {
    return <CategoryRows control={control} />;
  }
  if (step === 1) {
    return (
      <Stack spacing={2}>
        <RhfTextField
          control={control}
          name="product_name"
          label="Product title"
          hint="Use the exact product name hosts will understand during pod creation."
        />
      </Stack>
    );
  }
  if (step === 2) {
    return <VariantTabs control={control} watch={watch} setValue={setValue} onPickImage={onPickImage} />;
  }
  if (step === 3) {
    return <CommissionField control={control} />;
  }
  if (step === 4) {
    return <DeliveryField control={control} />;
  }
  return <Preview values={watch()} />;
}

function CommissionField({ control }: Readonly<{ control: Control<ProductListingValues> }>) {
  return (
    <Controller
      control={control}
      name="commission_pct"
      render={({ field }) => (
        <Box>
          <Typography fontWeight={900}>Duncit commission: {field.value}%</Typography>
          <Slider min={5} max={50} value={field.value} onChange={(_, value) => field.onChange(value)} valueLabelDisplay="auto" />
          <Alert severity="info">
            Higher commission improves marketplace viability, but approval still depends on product quality, pricing, and
            fulfillment clarity.
          </Alert>
        </Box>
      )}
    />
  );
}

function DeliveryField({ control }: Readonly<{ control: Control<ProductListingValues> }>) {
  return (
    <Controller
      control={control}
      name="delivery_target"
      render={({ field }) => (
        <FormControl>
          <FormLabel>Delivery option</FormLabel>
          <RadioGroup value={field.value} onChange={(event) => field.onChange(event.target.value)}>
            <FormControlLabel value="SHIPROCKET" control={<Radio />} label="ShipRocket delivery" />
          </RadioGroup>
          <Alert severity="info">
            Orders for this product are shipped through ShipRocket using your registered pickup location.
          </Alert>
        </FormControl>
      )}
    />
  );
}

function Preview({ values }: Readonly<{ values: ProductListingValues }>) {
  const primary = values.variants[0];
  return (
    <Stack spacing={1.25}>
      <Typography variant="h6" fontWeight={950}>
        {values.product_name || 'Product preview'}
      </Typography>
      <Typography color="text.secondary">{primary?.description}</Typography>
      <Typography>
        Categories: {values.categories.length} · Variants: {values.variants.length}
      </Typography>
      <Typography>Commission: {values.commission_pct}% · Delivery: ShipRocket</Typography>
    </Stack>
  );
}
