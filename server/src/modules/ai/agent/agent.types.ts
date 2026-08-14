/** Shapes shared by the agent's planner, its executors and its resolver. */

/** What the agent is allowed to carry out. Anything else is a conversation. */
export const AGENT_ACTIONS = ['NONE', 'CREATE_PODS', 'CREATE_CLUBS'] as const;
export type AgentAction = (typeof AGENT_ACTIONS)[number];

/**
 * The most one run will create.
 *
 * Every item is a real row with real side effects — a booked venue slot, an
 * audit entry, a notification to a venue owner. A capped run is one an
 * operator can read, check and undo; an uncapped one is a mess nobody asked
 * for. Asking again is cheap.
 */
export const MAX_BATCH = 10;

/** Roles that may make the agent create anything (mirrors the pod/club consoles). */
export const AGENT_ACT_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'];

export interface AgentResultItem {
  kind: 'POD' | 'CLUB';
  ok: boolean;
  id?: string;
  ref?: string;
  title: string;
  detail: string;
  /** ISO instant of the booked slot; the console formats it. */
  when?: string;
}

export interface AgentTurn {
  role: 'USER' | 'AGENT';
  content: string;
}

export interface AgentChatArgs {
  message: string;
  history?: AgentTurn[] | null;
}
