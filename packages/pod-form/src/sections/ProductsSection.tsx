import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { PodProductsField } from '@duncit/pod-product-picker';
import { usePodFormData } from '../context';
import { filterProductsForClub } from '../product-category';
import type { PodFormValues } from '../types';

/** Only offer products whose category matches the selected club's Super → Sub
 * (which pins the Super → Category → Sub path, since a Sub has one parent).
 * A club with no category offers NOTHING — the field shows "No products
 * available for this category." rather than the whole catalogue, matching the
 * server gate that would reject those products on save anyway.
 *
 * The picker itself is the shared one mWeb renders, so an admin attaching a
 * product sees the same catalogue, filters and selection gate as a host does on
 * their phone (rules 27 + 40). */
export default function ProductsSection() {
  const { products, clubs } = usePodFormData();
  const { control } = useFormContext<PodFormValues>();
  const clubId = useWatch({ control, name: 'club_id' });
  const club = clubs.find((entry) => String(entry.id) === String(clubId));
  const available = filterProductsForClub(products, club);

  return (
    <Controller
      control={control}
      name="product_requests"
      render={({ field, fieldState }) => (
        <PodProductsField
          value={field.value}
          onChange={field.onChange}
          products={available}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
