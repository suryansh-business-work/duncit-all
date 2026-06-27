import { Controller, useFormContext } from 'react-hook-form';
import ChipArrayField from './ChipArrayField';
import type { PodForm } from '../queries';

export default function OffersSection() {
  const { control } = useFormContext<PodForm>();
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
