export { default as PodDetailsPage } from './PodDetailsPage';
export { NO_POD_ACTIONS, NO_POD_BANNER } from './PodDetailsPage';
export type {
  PodDetailsActionPod,
  PodDetailsActions,
  PodDetailsBanner,
  PodDetailsViewProps,
} from './PodDetailsPage';
// The panel's translator resolves `ui.waterfall.*` beside its own copy, so a
// portal drawing a money waterfall next to this page borrows it rather than
// layering the same bundle a second time.
export { useTranslation as usePodDetailsTranslation } from './i18n/useTranslation';
export { PodDetailsScopeProvider, usePodDetailsScope } from './scope';
export type { PodDetailsScope } from './scope';
export { POD_DETAIL, type AdminPodAttendeeRow } from './queries';
export { default as SectionCard } from './SectionCard';
// Every way to reach someone (mailto / tel / wa.me chips) — the club admins
// card's own chips, shared with the Partners Club Admin host pages.
export { default as ContactChips, contactLinks, type ContactDetails, type ContactLink } from './ContactChips';
