import { PlaceholderScreen } from '@/components/PlaceholderScreen';

/** Seller verification — placeholder until the ecomm KYC flow ships. */
export function ProductsVerificationScreen() {
  return (
    <PlaceholderScreen
      title="Seller verification"
      icon="verified-user"
      subtitle="Seller verification is coming soon. Complete it here to start listing products."
    />
  );
}
