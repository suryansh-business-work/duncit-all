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

  "The MongoDB this API is connected to. The connection string is masked; the password never leaves the server."
  type TechDatabaseConnection {
    "ATLAS | SELF_HOSTED"
    provider: String!
    maskedUri: String!
    username: String
    authSource: String
    hosts: [String!]!
    replicaSet: String
    tls: Boolean!
    databaseName: String!
    "False when MONGO_DB_NAME is unset and Mongo fell back to the URI's default database."
    databaseNamePinned: Boolean!
    "production | staging | localhost"
    environment: String!
    "The GitHub Actions secret the deploy writes MONGO_URI from; null on a local server (server/.env)."
    secretName: String
    "The branch whose push deploys this environment."
    deployBranch: String
    secretsUrl: String
    deployRunsUrl: String
    "disconnected | connected | connecting | disconnecting | uninitialized"
    state: String!
    minPoolSize: Int!
    maxPoolSize: Int!
    maxTimeMs: Int!
    "The mongod's docker container on this host, whose stdout is its log (techContainerLogs); null when it is not one."
    logsContainer: String
  }

  type TechDatabaseServer {
    version: String!
    setName: String
    isWritablePrimary: Boolean
    members: [String!]!
    "The set's current primary and this connection's own member, as hello reports them."
    primary: String
    me: String
    lastWriteAt: String
    uptimeSeconds: Float
    connectionsCurrent: Int
    connectionsAvailable: Int
    connectionsTotalCreated: Float
    storageEngine: String
    "Operation counters since mongod started."
    opInsert: Float
    opQuery: Float
    opUpdate: Float
    opDelete: Float
    opCommand: Float
    memResidentBytes: Float
    networkBytesIn: Float
    networkBytesOut: Float
    networkRequests: Float
    "WiredTiger cache in use, and its configured ceiling."
    cacheBytes: Float
    cacheMaxBytes: Float
    "Why the serverStatus fields are empty — usually the database user lacks the clusterMonitor role."
    statusError: String
  }

  "One database on the same mongod, with its stats where the user may read them."
  type TechDatabaseDatabase {
    name: String!
    "True for the database this API is connected to."
    isLive: Boolean!
    sizeOnDisk: Float!
    empty: Boolean!
    storage: TechDatabaseStorage
    statsError: String
  }

  type TechDatabaseReplicaMember {
    name: String!
    "PRIMARY | SECONDARY | ARBITER | RECOVERING | STARTUP | … as mongod names them."
    stateStr: String!
    healthy: Boolean!
    "True for the member this connection is on."
    self: Boolean!
    uptimeSeconds: Float!
    optimeAt: String
    "Seconds behind the primary's last applied write; null for the primary."
    lagSeconds: Float
    lastHeartbeatAt: String
    pingMs: Float
    syncSourceHost: String
    priority: Float
    votes: Int
  }

  "replSetGetStatus + replSetGetConfig, read-only. Needs the clusterMonitor role."
  type TechDatabaseReplica {
    set: String!
    term: Float
    myState: String
    primary: String
    heartbeatIntervalMs: Float
    configVersion: Int
    members: [TechDatabaseReplicaMember!]!
  }

  "The oplog in local.oplog.rs: how much history the set keeps. Needs read on local (clusterMonitor)."
  type TechDatabaseOplog {
    entries: Float!
    dataBytes: Float!
    "The capped size; null where the server does not report it."
    maxBytes: Float
    firstAt: String
    lastAt: String
    windowSeconds: Float
  }

  type TechDatabaseStorage {
    collections: Int!
    views: Int!
    documents: Float!
    avgDocumentBytes: Float!
    dataBytes: Float!
    storageBytes: Float!
    indexes: Int!
    indexBytes: Float!
    totalBytes: Float!
    "The filesystem mongod keeps its data on; null where the server does not report it."
    fsUsedBytes: Float
    fsTotalBytes: Float
  }

  "One thing that happened to the API's database connection, kept in memory since the process started."
  type TechDatabaseEvent {
    at: String!
    "CONNECTED | CONNECT_FAILED | DISCONNECTED | RECONNECTED | ERROR | CLOSED"
    kind: String!
    message: String
    attempt: Int
  }

  type TechDatabaseInfo {
    connection: TechDatabaseConnection!
    "Null while the connection is down."
    server: TechDatabaseServer
    storage: TechDatabaseStorage
    pingMs: Float
    "The driver's reason the stats could not be read (scrubbed of the connection string)."
    statsError: String
    "Every database this user can read on the same server (production, staging, Lite), live one marked."
    databases: [TechDatabaseDatabase!]!
    databasesError: String
    "Null while disconnected or when the user lacks clusterMonitor — replicaError says which."
    replica: TechDatabaseReplica
    replicaError: String
    oplog: TechDatabaseOplog
    oplogError: String
    "Newest first."
    events: [TechDatabaseEvent!]!
    collectedAt: String!
  }

  type TechDatabaseCollection {
    name: String!
    documents: Float!
    dataBytes: Float!
    storageBytes: Float!
    indexBytes: Float!
    indexes: Int!
    avgDocumentBytes: Float!
  }

  type TechDatabaseCollectionTablePage {
    rows: [TechDatabaseCollection!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    "Tech > Database > Info: which database is live, its size, and the connection's recent events."
    techDatabaseInfo: TechDatabaseInfo!
    "Per-collection storage of the live database, for the shared table engine."
    techDatabaseCollectionsTable(query: TableQueryInput): TechDatabaseCollectionTablePage!
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
