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
    inodeUsagePercent: Float!
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
    "Swap from /proc/meminfo; all zeros where the host reports none."
    swap: TechBytesInfo!
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

  type TechRestartResult {
    ok: Boolean!
    error: String
  }

  type TechExecResult {
    stdout: String!
    stderr: String!
    exitCode: Int!
  }

  "One calendar day (admin time zone) of server readings. Null = no reading that day, not zero."
  type TechServerHistoryDay {
    date: String!
    samples: Int!
    cpuAvgPct: Float
    cpuPeakPct: Float
    loadAvg: Float
    memoryAvgPct: Float
    memoryPeakPct: Float
    swapPeakPct: Float
    diskPct: Float
    diskUsedBytes: Float
    diskTotalBytes: Float
    requests: Float
    errors5xx: Float
    latencyAvgMs: Float
    latencyP95Ms: Float
    latencyPeakMs: Float
    eventLoopP99PeakMs: Float
    rssPeakMb: Float
    probeLatencyMs: Float
    uptimePct: Float
  }

  "One container's CPU and memory over the month, with its peak memory per day."
  type TechServerHistoryContainer {
    name: String!
    cpuAvgPct: Float!
    cpuPeakPct: Float!
    memoryAvgMb: Float!
    memoryPeakMb: Float!
    dailyMemoryPeakMb: [Float]!
  }

  type TechServerHistorySummary {
    daysWithData: Int!
    cpuAvgPct: Float
    cpuPeakPct: Float
    memoryAvgPct: Float
    memoryPeakPct: Float
    diskPct: Float
    diskGrowthBytesPerDay: Float
    daysUntilDiskFull: Int
    latencyP95Ms: Float
    probeLatencyMs: Float
    uptimePct: Float
    requests: Float!
    errors5xx: Float!
  }

  type TechServerHistory {
    timeZone: String!
    days: [TechServerHistoryDay!]!
    containers: [TechServerHistoryContainer!]!
    summary: TechServerHistorySummary!
  }

  type TechServerAdviceItem {
    title: String!
    detail: String!
    "LOW | MEDIUM | HIGH"
    level: String!
  }

  type TechServerAdviceDay {
    date: String!
    note: String!
  }

  "The AI recommendation read from a month of server history."
  type TechServerAdvice {
    id: ID!
    "HEALTHY | WATCH | ACTION_NEEDED | INCONCLUSIVE"
    grade: String!
    headline: String!
    summary: String!
    trends: [TechServerAdviceItem!]!
    recommendations: [TechServerAdviceItem!]!
    notableDays: [TechServerAdviceDay!]!
    watchPoints: [String!]!
    periodDays: Int!
    daysWithData: Int!
    model: String!
    generatedBy: String!
    generatedAt: String!
  }

  extend type Query {
    "Live host metrics for the Tech portal Server > Info page. Pass sslHost to include that domain's TLS certificate."
    techServerInfo(sslHost: String): TechServerInfo!
    "Per-day server readings for the last month (at most 30 days), recorded every five minutes by this environment's API."
    techServerHistory(days: Int): TechServerHistory!
    "The newest AI server recommendation, or null before anyone asked for one."
    techServerAdvice: TechServerAdvice
    "Docker daemon + container status (requires the docker socket mounted into the API container)."
    techDockerInfo: TechDockerInfo!
    "Paged/searchable view over techDockerInfo.containers for the shared table engine."
    techDockerContainersTable(query: TableQueryInput): TechDockerContainerTablePage!
    "Recent logs for one container (demuxed) — polled by the restart log panel."
    techContainerLogs(name: String!, tail: Int): String!
  }

  extend type Mutation {
    "Restart one Docker container by name (SUPER_ADMIN / TECH_MANAGER). Audited."
    techRestartContainer(name: String!): TechRestartResult!
    "Run a shell command in the API container and return its output. SUPER_ADMIN only — host-root-equivalent via the mounted docker socket, and audited."
    techExec(command: String!): TechExecResult!
    "Send the month of server history to OpenAI and keep its recommendation (SUPER_ADMIN / TECH_MANAGER)."
    techGenerateServerAdvice(sslHost: String): TechServerAdvice!
  }
`;
