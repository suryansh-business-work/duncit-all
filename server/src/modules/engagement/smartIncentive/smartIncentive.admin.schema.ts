/**
 * Loyalty > Smart Incentive — the console's side: the programme's settings and
 * its dashboard. Filed under the Loyalty MCP category; the member fields
 * (smartIncentive.schema.ts) are not.
 */
export const smartIncentiveAdminTypeDefs = /* GraphQL */ `
  type SmartIncentiveSettings {
    "The programme's switch. Off: no pod page offers anything and checkout applies no unlocked offer."
    enabled: Boolean!
    "Seconds a member stays on a pod page before the offer shows."
    delay_seconds: Int!
    "The biggest discount a host may choose when switching it on for a pod."
    max_discount_pct: Int!
    updated_at: String!
  }

  "Loyalty > Smart Incentive > Settings. Every field is optional; an omitted one is left alone."
  input SmartIncentiveSettingsInput {
    enabled: Boolean
    "Whole seconds, 5 to 300."
    delay_seconds: Int
    "Whole percent, 1 to 90. Pods already above a lowered ceiling keep their discount until edited."
    max_discount_pct: Int
  }

  "One calendar month (UTC) of the programme."
  type SmartIncentiveMonthBucket {
    "'YYYY-MM'."
    month: String!
    "Offers the pod pages showed that month."
    offers: Int!
    "Bookings paid with an unlocked offer that month."
    bookings: Int!
    "What those bookings took off ticket money, GST included."
    discount: Float!
  }

  "How many opted-in pods offer one discount percentage."
  type SmartIncentiveDiscountShare {
    discount_pct: Int!
    pods: Int!
  }

  type SmartIncentiveTopHost {
    user_id: ID!
    name: String!
    email: String!
    "Pods this host switched the incentive on for."
    pods: Int!
    avg_discount_pct: Float!
    bookings: Int!
    discount_given: Float!
  }

  "Loyalty > Smart Incentive > Dashboard. Totals are all-time; 'monthly' covers the chosen window."
  type SmartIncentiveAdminStats {
    enabled: Boolean!
    max_discount_pct: Int!
    delay_seconds: Int!
    "Hosts who switched the incentive on for at least one pod (cancelled pods left out)."
    hosts_opted_in: Int!
    pods_opted_in: Int!
    "Opted-in pods that have not started yet."
    upcoming_pods: Int!
    "The average discount across opted-in pods (one decimal)."
    avg_discount_pct: Float!
    "Offers the pod pages have shown — one per member per pod."
    offers_shown: Int!
    "Bookings paid with an unlocked offer."
    bookings: Int!
    "bookings / offers_shown, as a percentage (one decimal)."
    conversion_pct: Float!
    "What those bookings took off ticket money, GST included — funded by the hosts."
    discount_given: Float!
    monthly: [SmartIncentiveMonthBucket!]!
    discount_split: [SmartIncentiveDiscountShare!]!
    top_hosts: [SmartIncentiveTopHost!]!
  }

  extend type Query {
    "The programme's settings. Any signed-in account reads them: a host's Create Pod form is capped by max_discount_pct."
    smartIncentiveSettings: SmartIncentiveSettings!
    "Loyalty > Smart Incentive > Dashboard. 'months' bounds the monthly series (default 12, max 36)."
    smartIncentiveAdminStats(months: Int): SmartIncentiveAdminStats!
  }

  extend type Mutation {
    "Loyalty: switch the programme, its delay and the biggest discount a host may offer."
    updateSmartIncentiveSettings(input: SmartIncentiveSettingsInput!): SmartIncentiveSettings!
  }
`;
