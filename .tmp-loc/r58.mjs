import { apply } from "./e.mjs";

apply("portals/ads-portal/src/pages/ads/MyAdsPage.tsx", [
  [
    "import {\n  AD_MEDIA_TYPE_OPTIONS,\n  AD_POSITION_OPTIONS,\n  AD_STATUS_COLORS,\n  AD_STATUS_OPTIONS,\n  adPositionLabel,\n  adTypeLabel,\n  formatAdCost,\n} from './ad-options';",
    "import {\n  AD_STATUS_COLORS,\n  adMediaTypeOptions,\n  adPositionOptions,\n  adStatusOptions,\n  adPositionLabel,\n  adTypeLabel,\n  formatAdCost,\n} from './ad-options';",
  ],
  ["        filter: { type: 'select', options: AD_POSITION_OPTIONS },\n        valueGetter: (row) => adPositionLabel(row.position),", "        filter: { type: 'select', options: adPositionOptions(t) },\n        valueGetter: (row) => adPositionLabel(row.position, t),"],
  ["        filter: { type: 'select', options: AD_MEDIA_TYPE_OPTIONS },\n        valueGetter: (row) => adTypeLabel(row.ad_type),", "        filter: { type: 'select', options: adMediaTypeOptions(t) },\n        valueGetter: (row) => adTypeLabel(row.ad_type, t),"],
  ["        filter: { type: 'select', options: AD_STATUS_OPTIONS },", "        filter: { type: 'select', options: adStatusOptions(t) },"],
]);

apply("portals/ads-portal/src/pages/dashboard/RecentAdsTable.tsx", [
  ["        valueGetter: (row) => adPositionLabel(row.position),", "        valueGetter: (row) => adPositionLabel(row.position, t),"],
]);
