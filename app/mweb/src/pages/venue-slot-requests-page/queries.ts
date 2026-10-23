import { gql } from '@apollo/client';

/** The owner's venues, for the booking requests' venue chips. */
export const MY_VENUES = gql`
  query MyVenuesForSlots {
    myVenues {
      id
      venue_name
    }
  }
`;

export const ALL_VENUES = 'ALL';
