export const shellStateTypeDefs = /* GraphQL */ `
  """
  How one person has their console chrome arranged: the taskbar along the
  bottom of every portal and the Agent tab stuck to its edge.

  Kept on the server rather than in the browser because the shell renders in
  all seventeen consoles and each is its own origin — "per browser" would mean
  "per portal you happen to have open".
  """
  type ShellWorkspaceState {
    "LEFT or RIGHT — which side the Agent tab is stuck to."
    agent_edge: String!
    "How far down that edge the Agent tab sits, 0 (top) to 1 (bottom)."
    agent_offset: Float!
    "IANA zone for the taskbar clock, or '' to follow the admin's setting."
    clock_zone: String!
    "Whether the taskbar clock counts seconds."
    clock_seconds: Boolean!
    "Window ids currently rolled up to the taskbar."
    minimised: [String!]!
    "Whether the sidebar is minimised to its icon rail."
    sidebar_collapsed: Boolean!
  }

  "Every field optional: the shell saves the one thing that changed."
  input ShellWorkspaceStateInput {
    agent_edge: String
    agent_offset: Float
    clock_zone: String
    clock_seconds: Boolean
    minimised: [String!]
    sidebar_collapsed: Boolean
  }

  extend type Query {
    """
    The caller's own chrome arrangement, with every default filled in when they
    have never changed anything. Always scoped to the caller — this is a
    personal preference and is never readable for anybody else.
    """
    shellWorkspaceState: ShellWorkspaceState!
  }

  extend type Mutation {
    """
    Store the caller's chrome arrangement. Only the fields present in the input
    are written, so two consoles open at once cannot overwrite each other's
    unrelated preferences.
    """
    saveShellWorkspaceState(input: ShellWorkspaceStateInput!): ShellWorkspaceState!
  }
`;
