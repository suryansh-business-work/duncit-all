/**
 * Ask Duncit — the role-based AI operations assistant in the member app (mWeb +
 * Native) and its control room in the AI portal.
 *
 * The assistant never decides what a person may do. Three layers do, in this
 * order, on every tool call: the Ask Duncit role policy (this module's
 * settings), the MCP refusal rules (console access, kill switches, write scope)
 * and finally the resolver's own RBAC — the same check the console runs.
 */

/**
 * The assistant role a conversation runs under. One account can hold several
 * (a member who also hosts); the app's studio mode picks which one, and the
 * server only accepts a mode the account actually holds.
 */
export const ASK_DUNCIT_ROLE_KEYS = [
  'MEMBER',
  'HOST',
  'VENUE_OWNER',
  'CLUB_ADMIN',
  'REGIONAL_CLUB_ADMIN',
  'ECOMM_BRAND',
  'FREELANCER',
  'STAFF',
  'SUPER_ADMIN',
] as const;

export type AskDuncitRoleKey = (typeof ASK_DUNCIT_ROLE_KEYS)[number];

export const isAskDuncitRoleKey = (value: unknown): value is AskDuncitRoleKey =>
  typeof value === 'string' && (ASK_DUNCIT_ROLE_KEYS as readonly string[]).includes(value);

/** The account role that grants each assistant role. MEMBER and STAFF are computed. */
export const ROLE_GRANTS: Readonly<Partial<Record<AskDuncitRoleKey, string>>> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  REGIONAL_CLUB_ADMIN: 'REGIONAL_CLUB_ADMIN',
  CLUB_ADMIN: 'CLUB_ADMIN',
  VENUE_OWNER: 'VENUE_OWNER',
  HOST: 'HOST',
  // Partner-brand sellers (partners-app/ecomm-brand), NOT the pet store staff.
  ECOMM_BRAND: 'ECOMM_MANAGER',
  FREELANCER: 'FREELANCER',
};

/** Account roles that are not staff seats — everything else opens a console. */
export const NON_STAFF_ROLES: ReadonlySet<string> = new Set([
  'USER',
  'HOST',
  'VENUE_OWNER',
  'ECOMM_MANAGER',
  'CLUB_ADMIN',
  'REGIONAL_CLUB_ADMIN',
  'FREELANCER',
  'MCP_USER',
]);

/** Which role is shown when no studio mode is given: the most specific seat wins. */
export const ROLE_PRECEDENCE: readonly AskDuncitRoleKey[] = [
  'SUPER_ADMIN',
  'STAFF',
  'REGIONAL_CLUB_ADMIN',
  'CLUB_ADMIN',
  'VENUE_OWNER',
  'HOST',
  'ECOMM_BRAND',
  'FREELANCER',
  'MEMBER',
];

/** Studio modes the apps send (packages/utils studio-mode) → assistant role. */
export const STUDIO_MODE_ROLE: Readonly<Record<string, AskDuncitRoleKey>> = {
  USER: 'MEMBER',
  HOST: 'HOST',
  VENUE: 'VENUE_OWNER',
  ECOMM: 'ECOMM_BRAND',
  CLUB: 'CLUB_ADMIN',
};

/** Surfaces a turn can come from. */
export const ASK_DUNCIT_SURFACES = ['MWEB', 'NATIVE', 'PORTAL'] as const;
export type AskDuncitSurface = (typeof ASK_DUNCIT_SURFACES)[number];

export const isAskDuncitSurfaceValue = (value: unknown): value is AskDuncitSurface =>
  typeof value === 'string' && (ASK_DUNCIT_SURFACES as readonly string[]).includes(value);

/** Socket events a turn streams to the asker's own room. */
export const ASK_DUNCIT_EVENTS = {
  start: 'askDuncit:start',
  delta: 'askDuncit:delta',
  tool: 'askDuncit:tool',
  action: 'askDuncit:action',
  done: 'askDuncit:done',
  error: 'askDuncit:error',
} as const;

/** Hard ceilings no setting can raise — they protect the process, not a policy. */
export const HARD_LIMITS = {
  maxInputChars: 8000,
  maxToolRounds: 10,
  maxHistoryTurns: 40,
  maxOutputTokens: 4000,
  maxAttachments: 6,
  maxAttachmentBytes: 15 * 1024 * 1024,
  maxAudioBytes: 10 * 1024 * 1024,
  maxSpeechChars: 2000,
  maxMemoryFacts: 30,
  maxToolResultChars: 12_000,
  maxFoundTools: 12,
  conversationTitleChars: 80,
  pendingActionTtlMs: 30 * 60 * 1000,
} as const;

/** The connection label MCP activity rows carry for calls the assistant made. */
export const ASK_DUNCIT_CLIENT_NAME = 'Ask Duncit';

/**
 * Tools the assistant can never reach, whatever a policy says: its own API
 * (a tool that asks Ask Duncit would loop), every curated MCP meta tool (the
 * engine has its own find/describe/call) and Duncit Lite, a separate product.
 */
export const ENGINE_EXCLUDED_FIELD = /askduncit/i;
export const ENGINE_EXCLUDED_CATEGORIES: ReadonlySet<string> = new Set(['lite', 'mcp']);

/** The Tech › Feature Flags key that shows Ask Duncit in the apps (and lets turns start). */
export const ASK_DUNCIT_FLAG = 'ask_duncit';
