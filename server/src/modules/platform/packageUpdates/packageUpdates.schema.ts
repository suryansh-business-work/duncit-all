import gql from 'graphql-tag';

export const packageUpdatesTypeDefs = gql`
  """
  How far a declared range is behind what npm publishes.

  INTERNAL is a \`workspace:\`/\`file:\` range that resolves inside the repo, and
  UNKNOWN is a range no registry can answer for — an alias, a git host, a
  tarball URL — or a name the registry did not return.
  """
  enum TechUpdateType {
    MAJOR
    MINOR
    PATCH
    UP_TO_DATE
    INTERNAL
    UNKNOWN
  }

  "One dependency, as one \`package.json\` declares it."
  type TechDependencyUpdate {
    name: String!
    "dependencies | devDependencies | peerDependencies | optionalDependencies"
    kind: String!
    "Exactly what the manifest declares — the range, not a resolved version."
    range: String!
    "Newest published version, or null when the registry was never asked."
    latest: String
    updateType: TechUpdateType!
  }

  "One \`package.json\`, with its dependency rows and their counts."
  type TechPackageUpdate {
    name: String!
    "Repo-relative path to the manifest."
    path: String!
    private: Boolean!
    total: Int!
    outdated: Int!
    major: Int!
    minor: Int!
    patch: Int!
    dependencies: [TechDependencyUpdate!]!
  }

  "Every manifest in the repo against the registry, as of one sweep."
  type TechPackageUpdatesReport {
    packages: [TechPackageUpdate!]!
    "ISO time of the last successful sweep; null when none has succeeded."
    checkedAt: String
    registry: String!
    totalPackages: Int!
    totalDependencies: Int!
    "Distinct dependency names the registry was asked about."
    uniqueDependencies: Int!
    outdated: Int!
    major: Int!
    minor: Int!
    patch: Int!
    "Why the last sweep failed, when it did."
    error: String
  }

  extend type Query {
    "Every package.json in the repo beside what npm publishes (SUPER_ADMIN / TECH_MANAGER). Cached; use techRefreshPackageUpdates to force a re-check."
    techPackageUpdates: TechPackageUpdatesReport!
  }

  extend type Mutation {
    "Re-ask the registry now, ignoring the cache."
    techRefreshPackageUpdates: TechPackageUpdatesReport!
  }
`;
