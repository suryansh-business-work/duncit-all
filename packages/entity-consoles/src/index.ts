// ---- the directory portal shell ------------------------------------------
export { mountDirectoryPortal } from './shared/mountDirectoryPortal';
export type { MountDirectoryPortalOptions, DirectoryConsole } from './shared/mountDirectoryPortal';
export { default as EntityDashboard } from './shared/EntityDashboard';
export type { EntityDashboardProps } from './shared/EntityDashboard';
export {
  CLUBS_SPEC,
  CLUB_ADMINS_SPEC,
  DIRECTORY_SPECS,
  HOSTS_SPEC,
  PODS_SPEC,
  VENUES_SPEC,
} from './shared/specs';
export {
  CLUB_ADMIN_COUNTS,
  CLUB_COUNTS,
  HOST_COUNTS,
  POD_COUNTS,
  VENUE_COUNTS,
} from './shared/counts';
export type {
  DirectoryCounts,
  DirectoryEntity,
  DirectorySpec,
  DirectoryTile,
  DirectoryTone,
} from './shared/types';

// ---- the venues console (from the ADMIN portal) --------------------------
export { default as VenuesPage } from './venues/list/VenuesPage';
export { default as VenueDetailsPage } from './venues/detail/VenueDetailsPage';
export { default as VenueEditorPage } from './venues/editor';
// The record <-> form mapping, so a caller (and the docs demo) can see exactly
// what one Save sends to each of the four venue mutations.
export {
  blankVenueValues,
  makeVenueFormSchema,
  valuesToSettingsInput,
  valuesToStep1,
  valuesToStep2,
  valuesToStep3,
  venueToValues,
  type VenueFormValues,
} from './venues/editor';

// ---- the clubs console (from the ADMIN portal) ---------------------------
export { default as ClubsPage } from './clubs/list/ClubsPage';
export { default as ClubDetailsPage } from './clubs/detail/ClubDetailsPage';
export { default as ClubEditorPage } from './clubs/editor';

// ---- the pods console (from the ADMIN portal) ----------------------------
// Admin's whole Pods group: the list with its editor and detail, plus each of
// the nine sub-pages the sidebar listed under it.
export { default as PodsPage } from './pods/list/PodsPage';
export { default as PodEditorPage } from './pods/list/pod-editor-page';
export { default as PodDetailsPage } from './pods/detail/PodDetailsPage';
export { default as PodsDashboardPage } from './pods/dashboard/PodsDashboardPage';
export { default as PodChangeRequestsPage } from './pods/change-requests/PodChangeRequestsPage';
export { default as AutoPodsPage } from './pods/auto';
export { default as AutoPodEditorPage } from './pods/auto/editor';
export { default as AutoPodDetailsPage } from './pods/auto/details';
export { default as PodSettingsPage } from './pods/settings/PodSettingsPage';
export { default as PodMonitoringPage } from './pods/monitoring/PodMonitoringPage';
export { default as EventTicketsPage } from './pods/event-tickets/EventTicketsPage';
export { default as PodIdeasPage } from './pods/ideas/PodIdeasPage';
export { default as PodPlansPage } from './pods/plans/PodPlansPage';

// ---- shared console internals -------------------------------------------
// All from the admin portal, and each used by more than one console here.
export { default as SuperCategoryFilter } from './shared/SuperCategoryFilter';
export { default as MediaGallery } from './shared/MediaGallery';
export { default as MediaLightbox } from './shared/MediaLightbox';
export { default as AiFillButton } from './shared/AiFillButton';
export { default as useMediaPicker } from './shared/useMediaPicker';

// ---- the change log every console's detail page shows -------------------
export { default as ChangeLogsSection } from './shared/change-logs';
export type { ChangeLogsSectionProps } from './shared/change-logs';
export type { EntityAuditType, EntityChangeLogRow } from './shared/change-logs/queries';
export * from './shared/aiFillSanitize';

// The two seams that used to reach into admin's own config.
export { AUTO_PODS_PATH } from './shared/routes';
export { resolveGraphqlUrl } from './shared/graphql-url';
