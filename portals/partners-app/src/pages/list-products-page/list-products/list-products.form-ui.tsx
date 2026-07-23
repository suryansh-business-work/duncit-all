import { useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Link,
  MenuItem,
  Radio,
  RadioGroup,
  Slider,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Controller, type Control, type UseFormSetValue, type UseFormWatch } from 'react-hook-form';
import { RhfTextField } from '@duncit/forms';
import {
  MY_BRAND_WAREHOUSES,
  type BrandWarehouse,
} from '../../ecomm-brand-page/brand-settings/warehouse.queries';
import type { ProductListingValues } from './list-products.types';
import CategoryRows from './CategoryRows';
import OptionsEditor from './OptionsEditor';
import VariantTabs from './VariantTabs';
import ListProductsPreview from './ListProductsPreview';

interface StepProps {
  step: number;
  brandId: string;
  control: Control<ProductListingValues>;
  watch: UseFormWatch<ProductListingValues>;
  setValue: UseFormSetValue<ProductListingValues>;
  onPickImage: (index: number) => void;
}

export function StepBody({ step, brandId, control, watch, setValue, onPickImage }: Readonly<StepProps>) {
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
          required
          hint="Use the exact product name hosts will understand during pod creation."
        />
      </Stack>
    );
  }
  if (step === 2) {
    return (
      <Stack spacing={2.5}>
        <OptionsEditor control={control} />
        <VariantTabs control={control} watch={watch} setValue={setValue} onPickImage={onPickImage} />
      </Stack>
    );
  }
  if (step === 3) {
    return <CommissionField control={control} />;
  }
  if (step === 4) {
    return <DeliveryField control={control} brandId={brandId} />;
  }
  return <ListProductsPreview values={watch()} brandId={brandId} />;
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

function DeliveryField({ control, brandId }: Readonly<{ control: Control<ProductListingValues>; brandId: string }>) {
  const { data, loading } = useQuery(MY_BRAND_WAREHOUSES, {
    variables: { brand_doc_id: brandId },
    skip: !brandId,
  });
  const warehouses: BrandWarehouse[] = data?.myBrandPickupLocations ?? [];
  return (
    <Stack spacing={2}>
      <Controller
        control={control}
        name="delivery_target"
        render={({ field }) => (
          <FormControl>
            <FormLabel>Delivery option</FormLabel>
            <RadioGroup value={field.value} onChange={(event) => field.onChange(event.target.value)}>
              <FormControlLabel value="SHIPROCKET" control={<Radio />} label="ShipRocket delivery" />
            </RadioGroup>
          </FormControl>
        )}
      />
      {!loading && warehouses.length === 0 && (
        <Alert severity="warning">
          This brand has no warehouses yet — add one in{' '}
          <Link component={RouterLink} to={`/ecomm-brand/${brandId}/settings`} fontWeight={800}>
            Brand Settings
          </Link>{' '}
          before listing the product.
        </Alert>
      )}
      <RhfTextField
        control={control}
        name="pickup_location_id"
        label="Ship-from warehouse"
        select
        required
        hint="The warehouse ShipRocket picks this product up from."
      >
        {warehouses.map((warehouse) => (
          <MenuItem key={warehouse.id} value={warehouse.id}>
            {warehouse.nickname} — {warehouse.city}
          </MenuItem>
        ))}
      </RhfTextField>
      <RhfTextField
        control={control}
        name="free_delivery_above"
        label="Free delivery above (₹)"
        type="number"
        inputProps={{ min: 0, step: 1, inputMode: 'numeric' }}
        hint="Order value of this product at/above which its delivery is free. Leave blank for no offer."
        sx={{ maxWidth: 320 }}
      />
      <Alert severity="info">
        Orders for this product are shipped through ShipRocket using the warehouse selected above.
      </Alert>
    </Stack>
  );
}
