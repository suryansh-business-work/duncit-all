import { gql } from '@apollo/client';
import { VENUE_SETTINGS_FRAGMENT } from '../../register-venue-page/queries';

export const CREATE_VENUE_SLOTS = gql`
  mutation RecurringCreateVenueSlots($input: BulkCreateVenueSlotsInput!) {
    createVenueSlots(input: $input) {
      id
    }
  }
`;

export const UPDATE_VENUE_SETTINGS = gql`
  mutation UpdateVenueSettings($venue_doc_id: ID!, $input: VenueSettingsInput!) {
    updateVenueSettings(venue_doc_id: $venue_doc_id, input: $input) {
      id
      ${VENUE_SETTINGS_FRAGMENT}
    }
  }
`;

const SLOT_TEMPLATE_FIELDS = `
  id
  name
  description
  category
  visibility
  is_default
  config {
    weekdays
    start_time
    end_time
    default_price
    per_day_price {
      weekday
      price
    }
    skip_weekly_off
    skip_holidays
  }
`;

export const MY_SLOT_TEMPLATES = gql`
  query MySlotTemplates($venue_id: ID) {
    mySlotTemplates(venue_id: $venue_id) { ${SLOT_TEMPLATE_FIELDS} }
  }
`;

export const CREATE_SLOT_TEMPLATE = gql`
  mutation CreateSlotTemplate($input: CreateSlotTemplateInput!) {
    createSlotTemplate(input: $input) { ${SLOT_TEMPLATE_FIELDS} }
  }
`;

export const DELETE_SLOT_TEMPLATE = gql`
  mutation DeleteSlotTemplate($id: ID!) {
    deleteSlotTemplate(id: $id)
  }
`;

export const BULK_DELETE_VENUE_SLOTS = gql`
  mutation BulkDeleteVenueSlots($input: BulkDeleteVenueSlotsInput!) {
    bulkDeleteVenueSlots(input: $input) {
      matched
      affected
      skipped
    }
  }
`;

export const BULK_UPDATE_VENUE_SLOTS = gql`
  mutation BulkUpdateVenueSlots($input: BulkUpdateVenueSlotsInput!) {
    bulkUpdateVenueSlots(input: $input) {
      matched
      affected
      skipped
    }
  }
`;
