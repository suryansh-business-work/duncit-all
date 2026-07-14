import { gql } from '@apollo/client';

export const LOCATIONS = gql`
  query Locations($filter: LocationFilterInput) {
    locations(filter: $filter) {
      id
      location_name
      country
      country_code
      state
      state_code
      city
      location_image
      location_zones {
        zone_name
        pincode
      }
      is_active
      updated_at
    }
  }
`;

/** Row shape shared by the locations table and the edit dialog. */
export interface LocationRow {
  id: string;
  location_name: string;
  country?: string | null;
  country_code?: string | null;
  state?: string | null;
  state_code?: string | null;
  city?: string | null;
  location_image?: string | null;
  location_zones: { zone_name: string; pincode?: string | null }[];
  is_active: boolean;
  created_at?: string | null;
}

/** Same selection as LOCATIONS rows (+ created_at for the table's Created filter). */
const LOCATION_ROW_FIELDS = gql`
  fragment LocationRowFields on Location {
    id
    location_name
    country
    country_code
    state
    state_code
    city
    location_image
    location_zones {
      zone_name
      pincode
    }
    is_active
    created_at
    updated_at
  }
`;

export const LOCATIONS_TABLE = gql`
  query LocationsTable($query: TableQueryInput) {
    locationsTable(query: $query) {
      total
      rows {
        ...LocationRowFields
      }
    }
  }
  ${LOCATION_ROW_FIELDS}
`;

export const CREATE_LOCATION = gql`
  mutation CreateLocation($input: CreateLocationInput!) {
    createLocation(input: $input) {
      id
    }
  }
`;

export const UPDATE_LOCATION = gql`
  mutation UpdateLocation($id: ID!, $input: UpdateLocationInput!) {
    updateLocation(location_doc_id: $id, input: $input) {
      id
    }
  }
`;

export const DELETE_LOCATION = gql`
  mutation DeleteLocation($id: ID!) {
    deleteLocation(location_doc_id: $id)
  }
`;

export const AI_FILL_LOCATION_AREAS = gql`
  mutation AiFillLocationAreas($input: AiLocationAreasInput!) {
    aiFillLocationAreas(input: $input)
  }
`;
