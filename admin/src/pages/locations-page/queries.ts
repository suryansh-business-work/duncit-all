import { gql } from '@apollo/client';

export const LOCATIONS = gql`
  query Locations($filter: LocationFilterInput) {
    locations(filter: $filter) {
      id
      location_id
      location_name
      country
      country_code
      state
      state_code
      city
      location_image
      location_pincode
      location_zones {
        zone_name
        zone_code
        pincode
      }
      is_active
      updated_at
    }
  }
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
