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

export type DayState = 'operational' | 'degraded' | 'partial_outage' | 'major_outage';
export type ServiceState = DayState | 'down' | 'nodata';

export interface DailyBar {
  date: string;
  uptime: number;
  state: DayState;
}

export interface ServiceSummary {
  latest: LatestCheck | null;
  uptime_24h: number | null;
  uptime_7d: number | null;
  uptime_90d: number | null;
  state: ServiceState;
  active_incidents: number;
  daily: DailyBar[];
}

export interface GlobalDaily extends DailyBar {
  operational: number;
  total: number;
}

export interface OverallRoll {
  state: ServiceState;
  operational: number;
  degraded: number;
  down: number;
  total: number;
  uptime_90d: number | null;
}

export interface SummaryResponse {
  generated_at: string;
  overall: OverallRoll;
  services: Record<string, ServiceSummary>;
  global: GlobalDaily[];
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
  state?: DayState;
  incidents?: number;
}

export interface HistoryResponse {
  service: string;
  points: HistoryPoint[];
  daily: DailyUptime[];
}

export type IncidentImpact = 'degraded' | 'partial_outage' | 'major_outage';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

export interface Incident {
  id: string;
  service_key: string;
  service_name: string;
  title: string;
  body: string;
  impact: IncidentImpact;
  status: IncidentStatus;
  started_at: string;
  resolved_at: string | null;
}

export interface IncidentsResponse {
  generated_at: string;
  incidents: Incident[];
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
