import gql from 'graphql-tag';

export const venueRentalTypeDefs = gql`
  "Finance > Rented Items > Settings — the rules every venue rental runs under."
  type RentalSettings {
    "Off hides Pod Rent everywhere and refuses new rentals."
    enabled: Boolean!
    "Terms & Conditions every renter agrees to, as rich-text HTML."
    terms_html: String!
    "Duncit's commission on rent (never on the deposit), percent."
    commission_pct: Float!
    "Whether a guest who backs out of the pod in time gets the rent back. A cancelled pod always refunds it."
    rent_refundable_on_backout: Boolean!
    "Whether a deposit comes back once the venue marks the item returned."
    deposit_refundable: Boolean!
    "Renting for a pod closes this many hours before it starts."
    booking_cutoff_hours: Int!
    "An unmarked deposit is refunded automatically this many days after the pod ends."
    deposit_auto_release_days: Int!
    updated_at: String
  }

  "What a guest needs before renting: the terms and the rules that apply to them."
  type PublicRentalSettings {
    enabled: Boolean!
    terms_html: String!
    rent_refundable_on_backout: Boolean!
    deposit_refundable: Boolean!
    booking_cutoff_hours: Int!
  }

  input RentalSettingsInput {
    enabled: Boolean
    terms_html: String
    commission_pct: Float
    rent_refundable_on_backout: Boolean
    deposit_refundable: Boolean
    booking_cutoff_hours: Int
    deposit_auto_release_days: Int
  }

  extend type Query {
    "Finance: the rental settings."
    rentalSettings: RentalSettings!
    "Anyone: the rental terms and refund rules."
    publicRentalSettings: PublicRentalSettings!
  }

  extend type Mutation {
    "Finance: change the rental settings. Fields left out keep their value."
    updateRentalSettings(input: RentalSettingsInput!): RentalSettings!
  }
`;
