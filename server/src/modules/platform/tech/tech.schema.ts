import gql from 'graphql-tag';

// Byte counts can exceed GraphQL Int's 2^31 limit (8 GB RAM ≈ 8.6e9), so all
// byte fields are Float.
export const techTypeDefs = gql`
  type TechOsInfo {
    platform: String!
    distro: String!
    type: String!
    release: String!
    arch: String!
    hostname: String!
    kernelUptimeSeconds: Float!
    processUptimeSeconds: Float!
    nodeVersion: String!
  }

  type TechCpuInfo {
    model: String!
    cores: Int!
    speedMhz: Int!
    loadAvg1: Float!
    loadAvg5: Float!
    loadAvg15: Float!
    usagePercent: Float!
  }

  type TechBytesInfo {
    totalBytes: Float!
    freeBytes: Float!
    usedBytes: Float!
    usagePercent: Float!
  }

  type TechDiskInfo {
    path: String!
    totalBytes: Float!
    freeBytes: Float!
    usedBytes: Float!
    usagePercent: Float!
  }

  type TechNetworkInterface {
    name: String!
    address: String!
    family: String!
    internal: Boolean!
  }

  type TechSslInfo {
    host: String!
    valid: Boolean!
    issuer: String
    subject: String
    validFrom: String
    validTo: String
    daysRemaining: Int
    protocol: String
    error: String
  }

  type TechServerInfo {
    os: TechOsInfo!
    cpu: TechCpuInfo!
    memory: TechBytesInfo!
    disk: TechDiskInfo!
    network: [TechNetworkInterface!]!
    sshPort: Int!
    ssl: TechSslInfo
    collectedAt: String!
  }

  type TechDockerContainer {
    id: String!
    name: String!
    image: String!
    state: String!
    status: String!
    createdAt: String
  }

  type TechDockerInfo {
    available: Boolean!
    version: String
    error: String
    containersRunning: Int!
    containersTotal: Int!
    containers: [TechDockerContainer!]!
  }

  "Server-side table page for the shared table engine (techDockerContainersTable)."
  type TechDockerContainerTablePage {
    rows: [TechDockerContainer!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    "Live host metrics for the Tech portal Server > Info page. Pass sslHost to include that domain's TLS certificate."
    techServerInfo(sslHost: String): TechServerInfo!
    "Docker daemon + container status (requires the docker socket mounted into the API container)."
    techDockerInfo: TechDockerInfo!
    "Paged/searchable view over techDockerInfo.containers for the shared table engine."
    techDockerContainersTable(query: TableQueryInput): TechDockerContainerTablePage!
  }
`;
