import { PlaceholderScreen } from '@/components/PlaceholderScreen';

/** "Your Products" — placeholder until the seller/listing flow ships. */
export function ProductsManageScreen() {
  return (
    <PlaceholderScreen
      title="Your Products"
      icon="inventory-2"
      subtitle="Product listing is coming soon. You'll manage your Duncit product catalogue here."
    />
  );
}
