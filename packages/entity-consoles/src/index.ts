// ---- the directory portal ------------------------------------------------
export { mountDirectoryPortal } from './shared/mountDirectoryPortal';
export type { MountDirectoryPortalOptions } from './shared/mountDirectoryPortal';
export { default as EntityDashboard } from './shared/EntityDashboard';
export type { EntityDashboardProps } from './shared/EntityDashboard';
export {
  CLUBS_SPEC,
  CLUB_ADMINS_SPEC,
  DIRECTORY_SPECS,
  HOSTS_SPEC,
  VENUES_SPEC,
} from './shared/specs';
export { CLUB_ADMIN_COUNTS, CLUB_COUNTS, HOST_COUNTS, VENUE_COUNTS } from './shared/counts';
export type {
  DirectoryCounts,
  DirectoryEntity,
  DirectorySpec,
  DirectoryTile,
  DirectoryTone,
} from './shared/types';

// ---- the venues console --------------------------------------------------
// Both screens are rendered by the venues portal, by admin and by onboarding.
export { default as VenuesPage } from './venues/list/VenuesPage';
export { default as VenuesTable } from './venues/list/VenuesTable';
export { default as VenueCard } from './venues/list/VenueCard';
export { default as VenueEditDialog } from './venues/list/VenueEditDialog';
export { default as VenueReviewDialog } from './venues/list/VenueReviewDialog';
export {
  APPROVE as APPROVE_VENUE,
  DELETE_VENUE,
  REJECT as REJECT_VENUE,
  SET_VENUE_ACTIVE,
  SET_VENUE_DEDUCTIONS,
  STATUSES as VENUE_STATUSES,
  STATUS_OPTIONS as VENUE_STATUS_OPTIONS,
  UPDATE_VENUE,
  VENUES,
  VENUES_TABLE,
  type VenueRow,
} from './venues/list/queries';

export { default as VenueDetailsPage } from './venues/detail/VenueDetailsPage';
export { default as VenueOverviewCard } from './venues/detail/VenueOverviewCard';

export { default as VenueAccordionForm } from './venues/create/VenueAccordionForm';

// ---- shared console internals -------------------------------------------
// Used by all four consoles AND by the onboarding portal's own screens, which
// is exactly why they live here rather than in one portal's components folder
// (rule 40 — anything used in more than two places is shared).
export { default as LifecycleActions } from './shared/LifecycleActions';
export { default as HardDeleteDialog } from './shared/HardDeleteDialog';
export { useEntityLifecycle } from './shared/useEntityLifecycle';
export { commissionLabel } from './shared/commissionLabel';
export { default as DateField } from './shared/DateField';
export { default as MediaPickerField } from './shared/MediaPickerField';
export { default as MediaListField } from './shared/MediaListField';
export { default as MediaPickerDialog } from './shared/MediaPickerDialog';
export { default as BankAccountVerificationSection } from './shared/BankAccountVerificationSection';
export { default as HealthScoreCard } from './shared/health/HealthScoreCard';
export { default as PodsTable } from './shared/pods-table/PodsTable';
export {
  PODS_TABLE,
  type PodApprovalStatus,
  type PodMode,
  type PodRow,
} from './shared/pods-table/queries';

// Form validation the host and brand forms share with the venue one. The regex
// patterns overlap @duncit/regex and should consolidate there — they moved
// as-is to keep this a relocation rather than a rewrite.
export * from './shared/validation/bankAccount';
export * from './shared/validation/rules';

// ---- the club-admins console --------------------------------------------
export { default as ClubAdminsPage } from './club-admins/ClubAdminsPage';
export { default as ClubAdminDetailsPage } from './club-admins/ClubAdminDetailsPage';

// ---- the hosts console ---------------------------------------------------
export { default as HostsPage } from './hosts/list/HostsPage';
export { default as HostDetailsPage } from './hosts/detail/HostDetailsPage';
export { default as HostAccordionForm } from './hosts/form/HostAccordionForm';
// The host form's schema and types — onboarding's create-host route builds on
// them, and so does the review dialog.
export * from './hosts/form/schema';

// ---- more shared internals ----------------------------------------------
// `categoryPath` and the survey answers viewer are each used by three or more
// screens (hosts, club admins, and onboarding's meetings), which is what makes
// them shared rather than one console's helper (rule 40).
export { categoryPath } from './shared/categoryPath';
export { SurveyAnswers, USER_SURVEY_RESPONSES } from './shared/survey-answers';
export type { SurveyKind, UserSurveyResponse } from './shared/survey-answers';

// ---- the clubs console ---------------------------------------------------
// Moved out of the ADMIN portal (the other three came from onboarding), so
// admin renders these from here now. Its club EDITOR stayed behind: it drives
// the AI-fill mutation, and pods uses the same button, so pulling it in would
// have made this package the home of admin's AI plumbing.
export { default as ClubsPage } from './clubs/list/ClubsPage';
export { default as ClubDetailsPage } from './clubs/detail/ClubDetailsPage';
export { default as SuperCategoryFilter } from './shared/SuperCategoryFilter';
export { default as MediaGallery } from './shared/MediaGallery';
export { default as MediaLightbox } from './shared/MediaLightbox';
// Admin's club editor stayed behind but reads the console's documents. Aliased
// because `CREATE`/`UPDATE` are far too generic for a shared barrel.
export {
  CLUB_FOR_EDIT,
  CREATE as CREATE_CLUB,
  UPDATE as UPDATE_CLUB,
} from './clubs/list/queries';
