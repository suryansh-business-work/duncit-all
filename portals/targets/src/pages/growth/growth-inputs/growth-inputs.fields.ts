import type { GrowthInputKey } from '../../../lib/growth-calculator';

/**
 * Each assumption and its label key, in the order a planner thinks: the pod,
 * then the partners, then the funnel. The form and the details dialog both
 * read it, so the two can never label an input differently.
 */
export const GROWTH_INPUT_FIELDS: ReadonlyArray<{ key: GrowthInputKey; label: string }> = [
  { key: 'pax_per_pod', label: 'targets.growth.inputs.paxPerPod' },
  { key: 'price_per_pax', label: 'targets.growth.inputs.pricePerPax' },
  { key: 'profit_margin_pct', label: 'targets.growth.inputs.profitMargin' },
  { key: 'hosts_per_venue', label: 'targets.growth.inputs.hostsPerVenue' },
  { key: 'pods_per_host_per_month', label: 'targets.growth.inputs.podsPerHost' },
  { key: 'venues_per_city', label: 'targets.growth.inputs.venuesPerCity' },
  { key: 'target_cities', label: 'targets.growth.inputs.targetCities' },
  { key: 'host_conversion_pct', label: 'targets.growth.inputs.hostConversion' },
  { key: 'venue_conversion_pct', label: 'targets.growth.inputs.venueConversion' },
];
