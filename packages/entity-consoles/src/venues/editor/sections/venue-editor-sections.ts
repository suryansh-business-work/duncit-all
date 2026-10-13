import type { DuncitTabItem } from '@duncit/tabs';

/**
 * The venue form's sections, in order.
 *
 * The first eight are the owner's own registration sections in the Partners
 * portal — same names, same order — so staff and an owner are reading one form.
 * The last three are staff-only: an owner never sets them from registration.
 *
 * Kept out of the section files so the navigation strip and the cards agree on
 * one list and one anchor per section.
 */
export type VenueEditorSectionKey =
  | 'details'
  | 'type-capacity'
  | 'food'
  | 'amenities'
  | 'documents'
  | 'owner'
  | 'payout'
  | 'leaves'
  | 'operations'
  | 'cancellation'
  | 'status';

/** Where the form opens, and what a link naming no section resolves to. */
export const FIRST_VENUE_EDITOR_SECTION: VenueEditorSectionKey = 'details';

/** The DOM id of a section's card — what the navigation strip scrolls to. */
export const sectionAnchor = (key: VenueEditorSectionKey) => `venue-editor-${key}`;

type Translate = (key: string) => string;

/**
 * Every label is a LITERAL `t('…')`: the localization gate reads the source,
 * and a key composed from the section's own key would be invisible to it.
 */
export const venueEditorSections = (t: Translate): DuncitTabItem<VenueEditorSectionKey>[] => [
  { value: 'details', label: t('directory.venueEditor.sectionDetails') },
  { value: 'type-capacity', label: t('directory.venueEditor.sectionTypeCapacity') },
  { value: 'food', label: t('directory.venueEditor.sectionFood') },
  { value: 'amenities', label: t('directory.venueEditor.sectionAmenities') },
  { value: 'documents', label: t('directory.venueEditor.sectionDocuments') },
  { value: 'owner', label: t('directory.venueEditor.sectionOwner') },
  { value: 'payout', label: t('directory.venueEditor.sectionPayout') },
  { value: 'leaves', label: t('directory.venueEditor.sectionLeaves') },
  { value: 'operations', label: t('directory.venueEditor.operations') },
  { value: 'cancellation', label: t('directory.venueEditor.cancellation') },
  { value: 'status', label: t('directory.venueEditor.statusAndMoney') },
];
