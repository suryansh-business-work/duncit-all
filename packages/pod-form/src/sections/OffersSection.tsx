import { Controller, useFormContext } from 'react-hook-form';
import ChipArrayField from '../components/ChipArrayField';
import type { PodFormValues } from '../types';

export default function OffersSection() {
  const { control } = useFormContext<PodFormValues>();
  return (
    <Controller
      control={control}
      name="what_this_pod_offers"
      render={({ field }) => (
        <ChipArrayField
          label="Amenities & facilities"
          value={field.value}
          onChange={field.onChange}
          placeholder="e.g. Free WiFi, Parking, Pet Friendly"
          helperText="Press Enter to add a chip. Keep each chip short."
        />
      )}
    />
  );
}
