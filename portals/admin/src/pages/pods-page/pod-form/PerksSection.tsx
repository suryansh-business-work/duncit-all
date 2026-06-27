import { Controller, useFormContext } from 'react-hook-form';
import ChipArrayField from './ChipArrayField';
import type { PodForm } from '../queries';

export default function PerksSection() {
  const { control } = useFormContext<PodForm>();
  return (
    <Controller
      control={control}
      name="available_perks"
      render={({ field }) => (
        <ChipArrayField
          label="Available perks"
          value={field.value}
          onChange={field.onChange}
          placeholder="e.g. Free Drink, Early Entry, VIP Access"
          helperText="Perks attendees unlock by joining."
        />
      )}
    />
  );
}
