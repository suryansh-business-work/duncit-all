export const dashboardLayoutTypeDefs = /* GraphQL */ `
  """
  One widget's place on a dashboard grid, in GridStack column/row units.
  """
  type DashboardLayoutItem {
    "The widget's stable id, as declared by the dashboard's widget catalogue."
    widget_id: ID!
    x: Int!
    y: Int!
    w: Int!
    h: Int!
  }

  """
  The signed-in user's saved arrangement of one dashboard. Null from
  myDashboardLayout when they have never customised it — the client then
  renders the dashboard's built-in defaults.
  """
  type DashboardLayout {
    dashboard_id: ID!
    items: [DashboardLayoutItem!]!
    updated_at: String
  }

  input DashboardLayoutItemInput {
    widget_id: ID!
    x: Int!
    y: Int!
    w: Int!
    h: Int!
  }

  extend type Query {
    """
    The signed-in user's layout for one dashboard, or null when they have
    never saved one. Always scoped to the caller — a layout is a personal
    preference and is never readable for anybody else.
    """
    myDashboardLayout(dashboard_id: ID!): DashboardLayout
  }

  extend type Mutation {
    """
    Store the caller's arrangement of one dashboard, replacing any previous
    one. Positions only — widget ids the running build does not define are
    simply ignored when the dashboard next renders.
    """
    saveDashboardLayout(dashboard_id: ID!, items: [DashboardLayoutItemInput!]!): DashboardLayout!

    """
    Forget the caller's arrangement of one dashboard so it falls back to the
    built-in defaults. Returns true whether or not a row existed.
    """
    resetDashboardLayout(dashboard_id: ID!): Boolean!
  }
`;
