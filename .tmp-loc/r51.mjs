import { apply } from "./e.mjs";

// ---- ad-options.ts: labels become translator-driven builders
apply("packages/ad-request-form/src/ad-options.ts", [
  [
    "import type { StatusColorMap } from '@duncit/ui';\nimport { formatMoney } from '@duncit/utils';",
    "import type { StatusColorMap } from '@duncit/ui';\nimport { formatMoney } from '@duncit/utils';\nimport type { Translate } from './i18n/useTranslation';",
  ],
  [
    "export const AD_MEDIA_TYPE_OPTIONS: ReadonlyArray<{ value: AdMediaType; label: string }> = [\n  { value: 'IMAGE', label: 'Image' },\n  { value: 'VIDEO', label: 'Video' },\n];",
    "export const adMediaTypeOptions = (\n  t: Translate,\n): ReadonlyArray<{ value: AdMediaType; label: string }> => [\n  { value: 'IMAGE', label: t('adRequest.type.image') },\n  { value: 'VIDEO', label: t('adRequest.type.video') },\n];",
  ],
  [
    "export const AD_POSITION_OPTIONS: ReadonlyArray<{ value: AdPosition; label: string }> = [\n  { value: 'AUTO', label: 'Auto (all placements)' },\n  { value: 'HOME_BOTTOM', label: 'Home Bottom' },\n  { value: 'SIDEBAR', label: 'Sidebar' },\n  { value: 'EXPLORE_SCROLL', label: 'Explore Scroll' },\n  { value: 'STATUS', label: 'Status' },\n  { value: 'VENUE_LIST', label: 'Venue List' },\n  { value: 'CLUB_LIST', label: 'Club List' },\n  { value: 'POD_LIST', label: 'Pod List' },\n  { value: 'POD_DETAILS', label: 'Pod Details' },\n];\n\nexport const adPositionLabel = (position: string): string =>\n  AD_POSITION_OPTIONS.find((option) => option.value === position)?.label ?? position;\n\nexport const adTypeLabel = (type: string): string =>\n  AD_MEDIA_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;",
    "export const adPositionOptions = (\n  t: Translate,\n): ReadonlyArray<{ value: AdPosition; label: string }> => [\n  { value: 'AUTO', label: t('adRequest.position.auto') },\n  { value: 'HOME_BOTTOM', label: t('adRequest.position.homeBottom') },\n  { value: 'SIDEBAR', label: t('adRequest.position.sidebar') },\n  { value: 'EXPLORE_SCROLL', label: t('adRequest.position.exploreScroll') },\n  { value: 'STATUS', label: t('adRequest.position.status') },\n  { value: 'VENUE_LIST', label: t('adRequest.position.venueList') },\n  { value: 'CLUB_LIST', label: t('adRequest.position.clubList') },\n  { value: 'POD_LIST', label: t('adRequest.position.podList') },\n  { value: 'POD_DETAILS', label: t('adRequest.position.podDetails') },\n];\n\nexport const adPositionLabel = (position: string, t: Translate): string =>\n  adPositionOptions(t).find((option) => option.value === position)?.label ?? position;\n\nexport const adTypeLabel = (type: string, t: Translate): string =>\n  adMediaTypeOptions(t).find((option) => option.value === type)?.label ?? type;",
  ],
  [
    "export const AD_STATUS_OPTIONS: ReadonlyArray<{ value: AdRequestStatus; label: string }> = [\n  { value: 'PENDING', label: 'Pending' },\n  { value: 'APPROVED', label: 'Approved' },\n  { value: 'LIVE', label: 'Live' },\n  { value: 'REJECTED', label: 'Rejected' },\n  { value: 'EXPIRED', label: 'Expired' },\n];",
    "export const adStatusOptions = (\n  t: Translate,\n): ReadonlyArray<{ value: AdRequestStatus; label: string }> => [\n  { value: 'PENDING', label: t('adRequest.status.pending') },\n  { value: 'APPROVED', label: t('adRequest.status.approved') },\n  { value: 'LIVE', label: t('adRequest.status.live') },\n  { value: 'REJECTED', label: t('adRequest.status.rejected') },\n  { value: 'EXPIRED', label: t('adRequest.status.expired') },\n];",
  ],
]);
