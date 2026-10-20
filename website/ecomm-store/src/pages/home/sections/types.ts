import type { StoreHomeSection, StoreSectionItem } from '../../../graphql/catalog';

/** Every home section renderer takes the section; the hero also reads the page's trust points. */
export interface SectionProps {
  section: StoreHomeSection;
  /** The first USP strip's points (at most four), shown under the hero's text. */
  trust?: readonly StoreSectionItem[];
  /** This section's heading is the page's h1 (a PAGE_INTRO opening a page with no title of its own). */
  pageTitle?: boolean;
}
