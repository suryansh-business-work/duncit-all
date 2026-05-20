import { gql } from '@apollo/client';

export const VENUE_TIMESLOT_TEMPLATE_FIELDS = gql`
  fragment VenueTimeslotTemplateFields on VenueTimeslotTemplate {
    id
    venue_id
    label
    duration_minutes
    capacity
    start_time
    end_time
    recurrence_kind
    weekdays
    month_days
    month_nth_weekday {
      nth
      weekday
    }
    specific_dates
    valid_from
    valid_until
    timezone
    is_active
    created_at
    updated_at
  }
`;

export const MY_VENUE_TIMESLOT_TEMPLATES = gql`
  query MyVenueTimeslotTemplates($venue_id: ID!) {
    myVenueTimeslotTemplates(venue_id: $venue_id) {
      ...VenueTimeslotTemplateFields
    }
  }
  ${VENUE_TIMESLOT_TEMPLATE_FIELDS}
`;

export const MY_VENUE_TIMESLOT_BLOCKS = gql`
  query MyVenueTimeslotBlocks($venue_id: ID!, $from: String, $to: String) {
    myVenueTimeslotBlocks(venue_id: $venue_id, from: $from, to: $to) {
      id
      venue_id
      template_id
      from
      to
      reason
      created_at
    }
  }
`;

export const VENUE_TIMESLOT_OVERRIDES = gql`
  query VenueTimeslotOverrides($venue_id: ID!, $from: String, $to: String) {
    venueTimeslotOverrides(venue_id: $venue_id, from: $from, to: $to) {
      id
      venue_id
      template_id
      occurrence_date
      capacity_override
      is_cancelled
      note
    }
  }
`;

export const VENUE_TIMESLOT_INSTANCES = gql`
  query VenueTimeslotInstances($venue_id: ID!, $from: String!, $to: String!) {
    venueTimeslotInstances(venue_id: $venue_id, from: $from, to: $to) {
      template_id
      label
      start_at
      end_at
      capacity
      is_blocked
      block_reason
      is_cancelled
      note
    }
  }
`;

export const CREATE_VENUE_TIMESLOT_TEMPLATE = gql`
  mutation CreateVenueTimeslotTemplate(
    $venue_id: ID!
    $input: VenueTimeslotTemplateInput!
  ) {
    createVenueTimeslotTemplate(venue_id: $venue_id, input: $input) {
      ...VenueTimeslotTemplateFields
    }
  }
  ${VENUE_TIMESLOT_TEMPLATE_FIELDS}
`;

export const UPDATE_VENUE_TIMESLOT_TEMPLATE = gql`
  mutation UpdateVenueTimeslotTemplate(
    $template_id: ID!
    $input: VenueTimeslotTemplateInput!
  ) {
    updateVenueTimeslotTemplate(template_id: $template_id, input: $input) {
      ...VenueTimeslotTemplateFields
    }
  }
  ${VENUE_TIMESLOT_TEMPLATE_FIELDS}
`;

export const DELETE_VENUE_TIMESLOT_TEMPLATE = gql`
  mutation DeleteVenueTimeslotTemplate($template_id: ID!) {
    deleteVenueTimeslotTemplate(template_id: $template_id)
  }
`;

export const SET_VENUE_TIMESLOT_TEMPLATE_ACTIVE = gql`
  mutation SetVenueTimeslotTemplateActive($template_id: ID!, $active: Boolean!) {
    setVenueTimeslotTemplateActive(template_id: $template_id, active: $active) {
      ...VenueTimeslotTemplateFields
    }
  }
  ${VENUE_TIMESLOT_TEMPLATE_FIELDS}
`;

export const BLOCK_VENUE_TIMESLOT = gql`
  mutation BlockVenueTimeslot($venue_id: ID!, $input: BlockVenueTimeslotInput!) {
    blockVenueTimeslot(venue_id: $venue_id, input: $input) {
      id
      venue_id
      template_id
      from
      to
      reason
      created_at
    }
  }
`;

export const UNBLOCK_VENUE_TIMESLOT = gql`
  mutation UnblockVenueTimeslot($block_id: ID!) {
    unblockVenueTimeslot(block_id: $block_id)
  }
`;

export const OVERRIDE_VENUE_TIMESLOT_CAPACITY = gql`
  mutation OverrideVenueTimeslotCapacity(
    $venue_id: ID!
    $template_id: ID!
    $occurrence_date: String!
    $capacity_override: Int
    $is_cancelled: Boolean
    $note: String
  ) {
    overrideVenueTimeslotCapacity(
      venue_id: $venue_id
      template_id: $template_id
      occurrence_date: $occurrence_date
      capacity_override: $capacity_override
      is_cancelled: $is_cancelled
      note: $note
    ) {
      id
      venue_id
      template_id
      occurrence_date
      capacity_override
      is_cancelled
      note
    }
  }
`;

export const CLEAR_VENUE_TIMESLOT_OVERRIDE = gql`
  mutation ClearVenueTimeslotOverride($override_id: ID!) {
    clearVenueTimeslotOverride(override_id: $override_id)
  }
`;
