export const searchTypeDefs = /* GraphQL */ `
  enum SearchSuggestionKind {
    CLUB
    CATEGORY
    POD
    ACTIVITY
  }

  "A club surfaced by search, with its next-7-day pods and the viewer's follow state."
  type SearchClubResult {
    club: Club!
    "Pods scheduled within the next 7 days, soonest first. Empty for 'more clubs'."
    upcoming_pods: [Pod!]!
    "ISO date of the soonest upcoming pod, or null when there are none."
    next_pod_date: String
    "Total attendees across the club's upcoming pods (drives the 'Most Participants' sort)."
    participant_count: Int!
    "Whether the signed-in viewer already follows this club."
    is_following: Boolean!
  }

  type SearchResults {
    "The trimmed query that produced these results."
    query: String!
    "Clubs hosting pods in the next 7 days — 'Happening This Week'."
    happening: [SearchClubResult!]!
    "Matching clubs without an upcoming pod — 'More Clubs Worth Exploring'."
    more_clubs: [SearchClubResult!]!
  }

  type SearchSuggestion {
    text: String!
    kind: SearchSuggestionKind!
  }

  input SearchDiscoveryInput {
    query: String
    category_id: ID
  }

  extend type Query {
    "Club-centric discovery search grouped by upcoming-pod availability."
    searchDiscovery(input: SearchDiscoveryInput): SearchResults!
    "Type-ahead suggestions across clubs, categories, pods and activities."
    searchSuggestions(query: String!, limit: Int): [SearchSuggestion!]!
  }
`;
