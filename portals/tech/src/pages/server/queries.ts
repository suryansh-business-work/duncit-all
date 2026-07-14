import { gql } from '@apollo/client';
import { urlConfigs } from '../../config/url-configs';

export const SERVER_INFO = gql`
  query TechServerInfo($sslHost: String) {
    techServerInfo(sslHost: $sslHost) {
      os {
        platform
        distro
        type
        release
        arch
        hostname
        kernelUptimeSeconds
        processUptimeSeconds
        nodeVersion
      }
      cpu {
        model
        cores
        speedMhz
        loadAvg1
        loadAvg5
        loadAvg15
        usagePercent
      }
      memory {
        totalBytes
        freeBytes
        usedBytes
        usagePercent
      }
      disk {
        path
        totalBytes
        freeBytes
        usedBytes
        usagePercent
      }
      network {
        name
        address
        family
        internal
      }
      sshPort
      ssl {
        host
        valid
        issuer
        subject
        validFrom
        validTo
        daysRemaining
        protocol
        error
      }
      collectedAt
    }
  }
`;

export const DOCKER_INFO = gql`
  query TechDockerInfo {
    techDockerInfo {
      available
      version
      error
      containersRunning
      containersTotal
      containers {
        id
        name
        image
        state
        status
        createdAt
      }
    }
  }
`;

/** Server-side table page over techDockerInfo.containers (search/sort/filter/paginate). */
export const DOCKER_CONTAINERS_TABLE = gql`
  query TechDockerContainersTable($query: TableQueryInput) {
    techDockerContainersTable(query: $query) {
      total
      rows {
        id
        name
        image
        state
        status
        createdAt
      }
    }
  }
`;

/** Extract the hostname from a URL, or undefined when it can't be parsed. */
export function hostFromUrl(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

/** The public host the API is served from — used to fetch its TLS certificate. */
export function apiHost(): string | undefined {
  return hostFromUrl(urlConfigs.graphqlUrl);
}

export interface BytesInfo {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usagePercent: number;
}
export interface DiskInfo extends BytesInfo {
  path: string;
}
export interface OsInfo {
  platform: string;
  distro: string;
  type: string;
  release: string;
  arch: string;
  hostname: string;
  kernelUptimeSeconds: number;
  processUptimeSeconds: number;
  nodeVersion: string;
}
export interface CpuInfo {
  model: string;
  cores: number;
  speedMhz: number;
  loadAvg1: number;
  loadAvg5: number;
  loadAvg15: number;
  usagePercent: number;
}
export interface NetworkInterface {
  name: string;
  address: string;
  family: string;
  internal: boolean;
}
export interface SslInfo {
  host: string;
  valid: boolean;
  issuer: string | null;
  subject: string | null;
  validFrom: string | null;
  validTo: string | null;
  daysRemaining: number | null;
  protocol: string | null;
  error: string | null;
}
export interface ServerInfo {
  os: OsInfo;
  cpu: CpuInfo;
  memory: BytesInfo;
  disk: DiskInfo;
  network: NetworkInterface[];
  sshPort: number;
  ssl: SslInfo | null;
  collectedAt: string;
}
export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  createdAt: string | null;
}
export interface DockerInfo {
  available: boolean;
  version: string | null;
  error: string | null;
  containersRunning: number;
  containersTotal: number;
  containers: DockerContainer[];
}
