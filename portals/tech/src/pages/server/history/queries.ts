import { gql } from '@apollo/client';

/** Per-day readings for the last month — written out longhand so the schema gate validates it. */
export const SERVER_HISTORY = gql`
  query TechServerHistory {
    techServerHistory {
      timeZone
      days {
        date
        samples
        cpuAvgPct
        cpuPeakPct
        loadAvg
        memoryAvgPct
        memoryPeakPct
        swapPeakPct
        diskPct
        diskUsedBytes
        diskTotalBytes
        requests
        errors5xx
        latencyAvgMs
        latencyP95Ms
        latencyPeakMs
        eventLoopP99PeakMs
        rssPeakMb
        probeLatencyMs
        uptimePct
      }
      containers {
        name
        cpuAvgPct
        cpuPeakPct
        memoryAvgMb
        memoryPeakMb
        dailyMemoryPeakMb
      }
      summary {
        daysWithData
        cpuAvgPct
        cpuPeakPct
        memoryAvgPct
        memoryPeakPct
        diskPct
        diskGrowthBytesPerDay
        daysUntilDiskFull
        latencyP95Ms
        probeLatencyMs
        uptimePct
        requests
        errors5xx
      }
    }
  }
`;

/** Balanced on its own — each document below owns its root field's braces. */
const ADVICE_FIELDS = `
  id
  grade
  headline
  summary
  trends {
    title
    detail
    level
  }
  recommendations {
    title
    detail
    level
  }
  notableDays {
    date
    note
  }
  watchPoints
  periodDays
  daysWithData
  model
  generatedBy
  generatedAt
`;

export const SERVER_ADVICE = gql`
  query TechServerAdvice {
    techServerAdvice {
      ${ADVICE_FIELDS}
    }
  }
`;

/** Sends the month to OpenAI and keeps the answer (SUPER_ADMIN / TECH_MANAGER). */
export const GENERATE_SERVER_ADVICE = gql`
  mutation TechGenerateServerAdvice($sslHost: String) {
    techGenerateServerAdvice(sslHost: $sslHost) {
      ${ADVICE_FIELDS}
    }
  }
`;

type Reading = number | null;

export interface ServerHistoryDay {
  date: string;
  samples: number;
  cpuAvgPct: Reading;
  cpuPeakPct: Reading;
  loadAvg: Reading;
  memoryAvgPct: Reading;
  memoryPeakPct: Reading;
  swapPeakPct: Reading;
  diskPct: Reading;
  diskUsedBytes: Reading;
  diskTotalBytes: Reading;
  requests: Reading;
  errors5xx: Reading;
  latencyAvgMs: Reading;
  latencyP95Ms: Reading;
  latencyPeakMs: Reading;
  eventLoopP99PeakMs: Reading;
  rssPeakMb: Reading;
  probeLatencyMs: Reading;
  uptimePct: Reading;
}

export interface ServerHistoryContainer {
  name: string;
  cpuAvgPct: number;
  cpuPeakPct: number;
  memoryAvgMb: number;
  memoryPeakMb: number;
  dailyMemoryPeakMb: Reading[];
}

export interface ServerHistorySummary {
  daysWithData: number;
  cpuAvgPct: Reading;
  cpuPeakPct: Reading;
  memoryAvgPct: Reading;
  memoryPeakPct: Reading;
  diskPct: Reading;
  diskGrowthBytesPerDay: Reading;
  daysUntilDiskFull: Reading;
  latencyP95Ms: Reading;
  probeLatencyMs: Reading;
  uptimePct: Reading;
  requests: number;
  errors5xx: number;
}

export interface ServerHistory {
  timeZone: string;
  days: ServerHistoryDay[];
  containers: ServerHistoryContainer[];
  summary: ServerHistorySummary;
}

export type ServerAdviceGrade = 'HEALTHY' | 'WATCH' | 'ACTION_NEEDED' | 'INCONCLUSIVE';
export type ServerAdviceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ServerAdviceItem {
  title: string;
  detail: string;
  level: ServerAdviceLevel;
}

export interface ServerAdvice {
  id: string;
  grade: ServerAdviceGrade;
  headline: string;
  summary: string;
  trends: ServerAdviceItem[];
  recommendations: ServerAdviceItem[];
  notableDays: Array<{ date: string; note: string }>;
  watchPoints: string[];
  periodDays: number;
  daysWithData: number;
  model: string;
  generatedBy: string;
  generatedAt: string;
}
