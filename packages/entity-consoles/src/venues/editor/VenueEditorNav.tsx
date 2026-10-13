import { useEffect, useMemo, useRef } from 'react';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import { useTranslation } from '@duncit/shell';
import {
  FIRST_VENUE_EDITOR_SECTION,
  sectionAnchor,
  venueEditorSections,
  type VenueEditorSectionKey,
} from './sections/venue-editor-sections';

/** Bring a section's card to the top, without animation for a reader who asked for none. */
function revealSection(key: VenueEditorSectionKey) {
  const still = globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document
    .getElementById(sectionAnchor(key))
    ?.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
}

/**
 * The venue form's sections at a glance — the same list the owner's form shows
 * in its side rail.
 *
 * The form stays ONE page with one Save (staff correct several sections in a
 * sitting), so this strip does not swap panels: picking a section scrolls to its
 * card. The selection is held in `?selectedtab=`, so a link can name the section
 * it is about ("…/edit?selectedtab=payout") and opens on it.
 */
export default function VenueEditorNav() {
  const { t } = useTranslation();
  const items = useMemo(() => venueEditorSections(t), [t]);
  const tabs = useTabParam<VenueEditorSectionKey>({
    items,
    fallback: FIRST_VENUE_EDITOR_SECTION,
  });

  // A plain open of the form stays at the top; everything else — a pick, or a
  // link that names a section — goes to the section.
  const opening = useRef(true);
  useEffect(() => {
    const plainOpen = opening.current && tabs.value === FIRST_VENUE_EDITOR_SECTION;
    opening.current = false;
    if (!plainOpen) revealSection(tabs.value);
  }, [tabs.value]);

  return (
    <DuncitTabs
      {...tabs}
      variant="scrollable"
      allowScrollButtonsMobile
      aria-label={t('directory.venueEditor.sectionsNav')}
      sx={{ borderBottom: 1, borderColor: 'divider' }}
    />
  );
}
