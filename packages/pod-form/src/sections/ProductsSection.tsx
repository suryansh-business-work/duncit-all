import { useWatch } from 'react-hook-form';
import ProductsField from '../components/ProductsField';
import { usePodFormData } from '../context';
import { filterProductsForClub } from '../product-category';

/** Only offer products whose category matches the selected club's Super → Sub
 * (which pins the Super → Category → Sub path, since a Sub has one parent).
 * A club with no category offers NOTHING — the field shows "No products
 * available for this category." rather than the whole catalogue, matching the
 * server gate that would reject those products on save anyway. */
export default function ProductsSection() {
  const { products, clubs } = usePodFormData();
  const clubId = useWatch({ name: 'club_id' }) as string | undefined;
  const club = clubs.find((entry) => String(entry.id) === String(clubId));
  const available = filterProductsForClub(products, club);
  return <ProductsField products={available} />;
}
