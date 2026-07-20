import { useWatch } from 'react-hook-form';
import ProductsField from '../components/ProductsField';
import { usePodFormData } from '../context';
import { filterProductsForClub } from '../product-category';

/** Only offer products whose category matches the selected club's Super →
 * Category → Sub. Falls back to all products when the club has no full category
 * (legacy clubs) so nothing disappears unexpectedly. */
export default function ProductsSection() {
  const { products, clubs } = usePodFormData();
  const clubId = useWatch({ name: 'club_id' }) as string | undefined;
  const club = clubs.find((entry) => String(entry.id) === String(clubId));
  const available = filterProductsForClub(products, club);
  return <ProductsField products={available} />;
}
