/**
 * The pods section shared by Venue Studio and Club Studio.
 *
 * The two studios read different queries (`venuePods` / `myClubPods`) that
 * return the same fields, so everything from the row up is one implementation:
 * the sections cannot drift in layout, wording or arithmetic (rules 27/34/40).
 */
export { default as StudioPodsSection } from './StudioPodsSection';
export { default as StudioPodsFigures } from './StudioPodsFigures';
export { default as StudioPodRow } from './StudioPodRow';
export { default as FigureTile } from './FigureTile';
export { CLUB_STUDIO_PODS, VENUE_STUDIO_PODS } from './queries';
export {
  BUCKET_LABEL_KEY,
  BUCKET_TONE,
  STUDIO_POD_LIST_CAP,
  fillPercent,
  podFillPercent,
  podPriceLabel,
  EMPTY_STUDIO_SUMMARY,
  type StudioPodTone,
} from './summary';
export type { StudioPod, StudioPodBucket, StudioPodSummary } from './types';
