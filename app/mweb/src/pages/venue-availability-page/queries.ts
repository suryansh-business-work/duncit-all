import { gql } from '@apollo/client';
import { VENUE_SETTINGS_FRAGMENT, type EditorVenue } from '@duncit/availability-calendar';

/** One `myVenues` row as this page reads it: the editor's fields plus the
 * city the switcher prints under the name. */
export interface AvailabilityVenue extends EditorVenue {
  city?: string | null;
}

/**
 * Every venue the owner has, with the settings the calendar greys out by
 * (holidays, weekly off days) and the recurring dialog edits (rules,
 * auto-extend). The same selection the Partners console mounts the editor on.
 */
export const MY_VENUES_AVAILABILITY = gql`
  query MyVenuesAvailability {
    myVenues {
      id
      venue_name
      status
      city
      capacity
      capacity_items {
        label
        capacity
      }
      ${VENUE_SETTINGS_FRAGMENT}
    }
  }
`;
