import PickupLocationsPanel from './PickupLocationsPanel';

interface Props {
  brandId: string;
}

/** BRAND-owned pickup locations for one brand. Thin wrapper over the shared
 * PickupLocationsPanel; the Duncit-owned equivalent lives in the settings page. */
export default function BrandPickupPanel({ brandId }: Readonly<Props>) {
  return <PickupLocationsPanel owner={{ owner_kind: 'BRAND', brandId }} />;
}
