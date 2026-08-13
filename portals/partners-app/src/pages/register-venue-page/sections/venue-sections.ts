import type { RegisterVenueMode, VenueSectionKey } from '../register-venue';

export interface VenueSectionDef {
  key: VenueSectionKey;
  label: string;
  hint: string;
}

/**
 * The registration sections, in order.
 *
 * Kept out of `SectionRail.tsx` so the form hook can read it without pulling
 * that file's icon elements in: the hook needs the same list to know which
 * sections `?selectedtab=` may name, and to find the one after the section
 * that was just saved.
 */
export const VENUE_SECTIONS: VenueSectionDef[] = [
  { key: 'details', label: 'Venue Details', hint: 'Name, images, category & location' },
  { key: 'type-capacity', label: 'Type & Capacity', hint: 'Venue type + capacity list' },
  { key: 'amenities', label: 'Amenities & Security', hint: 'Facilities, amenities & safety' },
  { key: 'documents', label: 'Venue Documents', hint: 'Uploads with document type' },
  { key: 'owner', label: 'Owner Details', hint: 'Contact for slot requests' },
  { key: 'leaves', label: 'Leaves & Holidays', hint: 'Closed dates — never bookable' },
  { key: 'review', label: 'Review & Submit', hint: 'Check everything and submit' },
];

/** Sections shown for the mode: an approved venue has nothing to submit, so
 * Review & Submit disappears; everything else stays navigable. */
export const sectionsForMode = (mode: RegisterVenueMode): VenueSectionDef[] =>
  mode === 'edit-approved' ? VENUE_SECTIONS.filter((section) => section.key !== 'review') : VENUE_SECTIONS;
