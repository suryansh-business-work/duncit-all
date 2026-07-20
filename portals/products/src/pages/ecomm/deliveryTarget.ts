/** Human labels for a product listing's delivery target. ShipRocket is the
 * option brands pick now; HOST/VENUE remain for legacy listings. */
export const DELIVERY_TARGET_LABELS: Record<string, string> = {
  HOST: 'Host delivery',
  VENUE: 'Venue delivery',
  SHIPROCKET: 'ShipRocket delivery',
};

export const deliveryTargetLabel = (value?: string | null): string =>
  DELIVERY_TARGET_LABELS[value ?? ''] ?? 'Delivery';

export const DELIVERY_TARGET_OPTIONS = Object.entries(DELIVERY_TARGET_LABELS).map(([value, label]) => ({
  value,
  label,
}));
