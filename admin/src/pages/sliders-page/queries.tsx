import { gql } from '@apollo/client';
import PublicIcon from '@mui/icons-material/Public';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MapIcon from '@mui/icons-material/Map';

export const SLIDERS = gql`
  query Sliders($filter: SliderFilterInput) {
    sliders(filter: $filter) {
      id
      slider_id
      title
      description
      media_url
      media_type
      link_url
      scope
      super_category_slug
      location_id
      zone_name
      sort_order
      starts_at
      ends_at
      is_active
    }
  }
`;
export const SUPER_CATEGORIES = gql`
  query SuperCategoriesForSlider {
    categories(filter: { level: SUPER }) {
      id
      name
      slug
    }
  }
`;
export const LOCATIONS = gql`
  query LocationsForSlider {
    locations {
      id
      location_id
      location_name
      location_zones {
        zone_name
      }
    }
  }
`;
export const CREATE = gql`
  mutation CreateSlider($input: CreateSliderInput!) {
    createSlider(input: $input) {
      id
    }
  }
`;
export const UPDATE = gql`
  mutation UpdateSlider($id: ID!, $input: UpdateSliderInput!) {
    updateSlider(slider_doc_id: $id, input: $input) {
      id
    }
  }
`;
export const DELETE = gql`
  mutation DeleteSlider($id: ID!) {
    deleteSlider(slider_doc_id: $id)
  }
`;

export const SCOPES = [
  { value: 'GLOBAL', label: 'Global', icon: <PublicIcon fontSize="small" /> },
  { value: 'LOCATION', label: 'Location', icon: <LocationOnIcon fontSize="small" /> },
  { value: 'ZONE', label: 'Zone', icon: <MapIcon fontSize="small" /> },
];

export interface SliderForm {
  id?: string;
  slider_id: string;
  title: string;
  description: string;
  media_url: string;
  media_type: 'IMAGE' | 'VIDEO';
  link_url: string;
  scope: 'GLOBAL' | 'LOCATION' | 'ZONE';
  super_category_slug: string;
  location_id: string;
  zone_name: string;
  sort_order: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

export const blankForm: SliderForm = {
  slider_id: '',
  title: '',
  description: '',
  media_url: '',
  media_type: 'IMAGE',
  link_url: '',
  scope: 'GLOBAL',
  super_category_slug: '',
  location_id: '',
  zone_name: '',
  sort_order: 0,
  starts_at: '',
  ends_at: '',
  is_active: true,
};

export const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
