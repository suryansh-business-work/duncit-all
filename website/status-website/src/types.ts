/** Shared shapes of the server's /status/* and /health payloads. */

export interface StatusService {
  key: string;
  name: string;
  url: string;
  description: string;
  probe?: string;
  health?: string;
}

export interface ServiceGroup {
  title: string;
  items: StatusService[];
}

export type StatusEnvironment = 'production' | 'staging';

export interface ServicesResponse {
  generated_at: string;
  environment: StatusEnvironment;
  groups: ServiceGroup[];
}

export interface LatestCheck {
  ok: boolean;
  status_code: number | null;
  latency_ms: number | null;
  checked_at: string;
}

export interface ServiceSummary {
  latest: LatestCheck | null;
  uptime_24h: number | null;
  uptime_7d: number | null;
  uptime_90d: number | null;
}

export interface SummaryResponse {
  generated_at: string;
  services: Record<string, ServiceSummary>;
}

export interface HistoryPoint {
  t: string;
  ok: boolean;
  status_code: number | null;
  latency_ms: number | null;
}

export interface DailyUptime {
  date: string;
  uptime: number | null;
  checks: number;
}

export interface HistoryResponse {
  service: string;
  points: HistoryPoint[];
  daily: DailyUptime[];
}

export interface SslInfo {
  authorized: boolean;
  issuer: string | null;
  subject: string | null;
  validFrom: string | null;
  validTo: string | null;
  daysRemaining: number | null;
  protocol: string | null;
}

export interface ProbeResult {
  url: string;
  ok: boolean;
  statusCode: number | null;
  statusText: string | null;
  ssl: SslInfo | null;
  error?: string;
}

export interface HealthReport {
  status: string;
  version: string;
  environment: string;
  node: string;
  platform: string;
  hostname: string;
  uptime: { processSeconds: number; systemSeconds: number };
  memory: { rssBytes: number; systemTotalBytes: number; systemFreeBytes: number };
  checks: { database: string };
}

export interface Branding {
  app_name?: string;
  logo_url?: string;
  primary_color?: string;
}
