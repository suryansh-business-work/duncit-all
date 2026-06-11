import { useFormikContext } from 'formik';
import ChipArrayField from './ChipArrayField';
import type { PodForm } from '../queries';

export default function PerksSection() {
  const { values, setFieldValue } = useFormikContext<PodForm>();
  return (
    <ChipArrayField
      label="Available perks"
      value={values.available_perks}
      onChange={(next) => setFieldValue('available_perks', next)}
      placeholder="e.g. Free Drink, Early Entry, VIP Access"
      helperText="Perks attendees unlock by joining."
    />
  );
}
