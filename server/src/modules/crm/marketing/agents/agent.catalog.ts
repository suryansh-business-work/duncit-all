import { z } from 'zod';
import { SOCIAL_PLATFORMS } from '../social/social.types';

/**
 * The marketing agents, defined in code.
 *
 * An agent is a recurring job that PLANS with Claude and ACTS through the
 * tools in agent.tools.ts — never through free text. What it may touch is the
 * `tools` list here, which the runner enforces: a plan that names any other
 * tool has that step refused and recorded as FAILED. The schedule and the
 * params are a manager's to change from Marketing › Automation › Agents; the
 * rest is this file, so a new capability is a code change that is reviewed.
 */
export const AGENT_KEYS = ['CONTENT_PLANNER', 'COMMUNITY_WATCH', 'ACCOUNT_DOCTOR'] as const;
export type MarketingAgentKey = (typeof AGENT_KEYS)[number];

export const AGENT_CADENCES = ['DAY', 'WEEK'] as const;
export type AgentCadence = (typeof AGENT_CADENCES)[number];

export const TOOL_KEYS = [
  'social.list_accounts',
  'social.generate_ideas',
  'social.create_post',
  'comments.analyze',
  'accounts.health_check',
] as const;
export type AgentToolKey = (typeof TOOL_KEYS)[number];

/** When an agent runs: every day or every week, at an hour of the admin's zone. `weekday` (0 Sunday … 6 Saturday) matters for WEEK only. */
export interface AgentSchedule {
  every: AgentCadence;
  hour: number;
  weekday: number;
}

export const MAX_BRIEF = 500;
export const MAX_POSTS_PER_WEEK = 7;
const DEFAULT_POSTS_PER_WEEK = 3;

/** The one params shape every agent is configured with; an agent that reads none of it says so with `has_params`. */
export const AGENT_PARAMS = z.object({
  brief: z.string().trim().max(MAX_BRIEF).default(''),
  networks: z.array(z.enum(SOCIAL_PLATFORMS)).max(SOCIAL_PLATFORMS.length).default([]),
  posts_per_week: z.number().int().min(1).max(MAX_POSTS_PER_WEEK).default(DEFAULT_POSTS_PER_WEEK),
});
export type AgentParams = z.infer<typeof AGENT_PARAMS>;

export const AGENT_SCHEDULE = z.object({
  every: z.enum(AGENT_CADENCES),
  hour: z.number().int().min(0).max(23),
  weekday: z.number().int().min(0).max(6).default(0),
});

export interface AgentDefinition {
  key: MarketingAgentKey;
  /** What the run log calls it. */
  name: string;
  description: string;
  schedule: AgentSchedule;
  /** The params it is configured with, validated before they are stored and again before a run. */
  params: typeof AGENT_PARAMS;
  /** Whether it reads the params at all — the console shows the form only when it does. */
  has_params: boolean;
  /** The only tools its plan may call. */
  tools: readonly AgentToolKey[];
  /** Whether what it produces waits for a person on Approvals before anything goes out. */
  needs_approval: boolean;
}

export const AGENTS: Readonly<Record<MarketingAgentKey, AgentDefinition>> = {
  CONTENT_PLANNER: {
    key: 'CONTENT_PLANNER',
    name: 'Content planner',
    description:
      'Each week, writes post ideas for the connected networks from the brief and turns the best into posts spread across the coming week — text posts where a network takes them, drafts where it needs media. Every post waits on Approvals.',
    schedule: { every: 'WEEK', hour: 9, weekday: 1 },
    params: AGENT_PARAMS,
    has_params: true,
    tools: ['social.list_accounts', 'social.generate_ideas', 'social.create_post'],
    needs_approval: true,
  },
  COMMUNITY_WATCH: {
    key: 'COMMUNITY_WATCH',
    name: 'Community watch',
    description:
      'Each day, runs the AI review over new comments on the connected accounts and reports what was flagged. Nothing is posted or replied to.',
    schedule: { every: 'DAY', hour: 8, weekday: 0 },
    params: AGENT_PARAMS,
    has_params: false,
    tools: ['social.list_accounts', 'comments.analyze'],
    needs_approval: false,
  },
  ACCOUNT_DOCTOR: {
    key: 'ACCOUNT_DOCTOR',
    name: 'Account doctor',
    description:
      'Each day, checks every connected account — token, profile read, expiry — and reports the ones that need a person to reconnect or look.',
    schedule: { every: 'DAY', hour: 7, weekday: 0 },
    params: AGENT_PARAMS,
    has_params: false,
    tools: ['social.list_accounts', 'accounts.health_check'],
    needs_approval: false,
  },
};

export const isAgentKey = (value: unknown): value is MarketingAgentKey =>
  typeof value === 'string' && (AGENT_KEYS as readonly string[]).includes(value);

/** The definition behind a key, or a thrown error for one the catalogue does not know. */
export function agentDefinition(key: string): AgentDefinition {
  if (!isAgentKey(key)) throw new Error(`Unknown marketing agent "${key}"`);
  return AGENTS[key];
}
