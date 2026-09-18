import type { StoreHomeSection } from '../../../graphql/catalog';

/** Every home section renderer takes the section and nothing else. */
export interface SectionProps {
  section: StoreHomeSection;
}
