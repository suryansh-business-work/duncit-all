import { useFormikContext } from 'formik';
import ChipArrayField from './ChipArrayField';
import type { PodForm } from '../queries';

export default function OffersSection() {
  const { values, setFieldValue } = useFormikContext<PodForm>();
  return (
    <ChipArrayField
      label="Amenities & facilities"
      value={values.what_this_pod_offers}
      onChange={(next) => setFieldValue('what_this_pod_offers', next)}
      placeholder="e.g. Free WiFi, Parking, Pet Friendly"
      helperText="Press Enter to add a chip. Keep each chip short."
    />
  );
}
