import { gql } from '@apollo/client';

/** Row shape shared by the sliders table and the edit dialog. */
export interface SliderRow {
  id: string;
  slider_id: string;
  title: string;
  description?: string | null;
  media_url: string;
  media_type: string;
  link_type?: string | null;
  link_target_kind?: string | null;
  link_target_id?: string | null;
  link_url?: string | null;
  scope: 'GLOBAL' | 'LOCATION' | 'ZONE';
  super_category_slug?: string | null;
  location_id?: string | null;
  zone_name?: string | null;
  sort_order?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
  created_at?: string | null;
}

/** Same selection as SLIDERS rows (+ created_at for the table's Created filter). */
const SLIDER_ROW_FIELDS = gql`
  fragment SliderRowFields on Slider {
    id
    slider_id
    title
    description
    media_url
    media_type
    link_type
    link_target_kind
    link_target_id
    link_target_slug
    link_target_title
    link_url
    scope
    super_category_slug
    location_id
    zone_name
    sort_order
    starts_at
    ends_at
    is_active
    created_at
  }
`;

export const SLIDERS_TABLE = gql`
  query SlidersTable($query: TableQueryInput) {
    slidersTable(query: $query) {
      total
      rows {
        ...SliderRowFields
      }
    }
  }
  ${SLIDER_ROW_FIELDS}
`;
