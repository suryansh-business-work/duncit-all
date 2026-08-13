import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { getSystemPrompt } from '@modules/ai/prompt/prompt.service';
import { effectiveRoleKeys } from '@modules/access/user/effective-roles';
import { hasPortalAccess } from '@modules/portals/portal.gate';
import { openaiChat, type OpenAiMessage } from '@services/openai/openai.client';
import { logs } from '@observability/log';
import { ASK_BOTS, BOT_BY_KEY } from './askBot.bots';
import { findPage, navigationMap } from './askBot.catalog';
import { SURFACE_BY_KEY } from './askBot.surfaces';
import { callerEnvironment, surfaceUrl, type RequestHeaders } from './askBot.links';

/** Enough history for a follow-up to make sense, not enough to crowd the map. */
const HISTORY_TURNS = 8;
const MAX_LINKS = 4;
const MAX_FOLLOWUPS = 3;
const MAX_MESSAGE = 1000;

export interface AskBotTurn {
  role: 'USER' | 'BOT';
  content: string;
}

export interface AskBotChatArgs {
  bot_key: string;
  message: string;
  history?: AskBotTurn[] | null;
}

interface ModelLink {
  surface?: unknown;
  path?: unknown;
  label?: unknown;
}

interface ModelReply {
  answer?: unknown;
  links?: unknown;
  followups?: unknown;
}

export interface ResolvedLink {
  surface_key: string;
  surface_name: string;
  label: string;
  path: string;
  url: string;
  has_access: boolean;
}

const badRequest = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

/**
 * A field of the model's JSON, but only if it really is text.
 *
 * The reply is parsed from a string the model wrote, so every field is
 * genuinely unknown. Coercing one would turn an object into the literal
 * "[object Object]" and carry it into a label or a path; treating it as absent
 * is the honest reading, and an absent path simply drops the link (S6551).
 */
const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/**
 * The bot list. Availability is one question — is there an OpenAI key — so it is
 * asked once rather than per bot.
 */
export async function listBots() {
  const apiKey = await getRuntimeEnvValue('OPENAI_API_KEY');
  const configured = !!apiKey.trim();
  return ASK_BOTS.map((bot) => ({
    key: bot.key,
    icon: bot.icon,
    is_available: configured,
    unavailable_reason: configured ? null : 'NOT_CONFIGURED',
  }));
}

/**
 * Turn the model's chosen pages into links.
 *
 * Every one is looked up in the navigation map and DROPPED if it is not there:
 * the model is told to copy paths verbatim, but a language model asked for a URL
 * will eventually invent a plausible one, and a confident link to a 404 is worse
 * than no link. What survives is resolved against the caller's own environment,
 * so a developer gets localhost and everyone else gets the real thing.
 */
async function resolveLinks(raw: unknown, userId: string | null, req: RequestHeaders | null) {
  if (!Array.isArray(raw)) return [];
  const environment = callerEnvironment(req);
  const roleKeys = userId ? await effectiveRoleKeys(userId) : [];
  const seen = new Set<string>();
  const links: ResolvedLink[] = [];

  for (const entry of raw as ModelLink[]) {
    if (links.length >= MAX_LINKS) break;
    const surfaceKey = text(entry?.surface);
    const page = findPage(surfaceKey, text(entry?.path));
    const surface = SURFACE_BY_KEY.get(surfaceKey);
    if (!page || !surface) continue;
    const dedupe = `${surfaceKey} ${page.path}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    links.push({
      surface_key: surface.key,
      surface_name: surface.name,
      label: text(entry?.label) || page.label,
      path: page.path,
      url: surfaceUrl(surface, environment, page.path),
      // Only a staff console has a gate; the member apps and the public sites
      // are open to everyone who can already see this bot.
      has_access: surface.kind !== 'PORTAL' || hasPortalAccess(surface.key, roleKeys),
    });
  }
  return links;
}

const stringList = (raw: unknown, max: number): string[] =>
  Array.isArray(raw) ? raw.map(text).filter(Boolean).slice(0, max) : [];

/** The turns as OpenAI wants them, newest-last and capped. */
function toMessages(history: AskBotTurn[] | null | undefined, message: string): OpenAiMessage[] {
  const turns = (history ?? [])
    .filter((turn) => text(turn?.content))
    .slice(-HISTORY_TURNS)
    .map<OpenAiMessage>((turn) => ({
      role: turn.role === 'BOT' ? 'assistant' : 'user',
      content: text(turn.content).slice(0, MAX_MESSAGE),
    }));
  return [...turns, { role: 'user', content: message }];
}

export async function chat(args: AskBotChatArgs, userId: string | null, req: RequestHeaders | null) {
  const bot = BOT_BY_KEY.get(args.bot_key);
  if (!bot) throw badRequest('Unknown bot');
  const message = text(args.message).slice(0, MAX_MESSAGE);
  if (!message) throw badRequest('A question is required');

  const systemContext = await getSystemPrompt(bot.prompt_key, { navigation_map: navigationMap() });
  const result = await openaiChat({
    task: 'askbot.navigation',
    messages: [{ role: 'system', content: systemContext }, ...toMessages(args.history, message)],
    // The reply is a contract the resolver parses, not a voice — near-zero
    // temperature keeps the model copying paths instead of paraphrasing them.
    temperature: 0.1,
    max_tokens: 700,
    json: true,
    detail: bot.key,
    user_id: userId ?? undefined,
  });

  if (!result.ok) {
    const code = result.code === 'NOT_CONFIGURED' ? 'AI_NOT_CONFIGURED' : 'AI_UPSTREAM_ERROR';
    throw new GraphQLError(result.message, { extensions: { code } });
  }

  let parsed: ModelReply;
  try {
    parsed = JSON.parse(result.content) as ModelReply;
  } catch (err) {
    logs.server.error('askBot', 'chat', {
      error: err,
      msg: 'Ask Bot reply was not JSON',
      bot_key: bot.key,
    });
    throw new GraphQLError('The bot returned an answer that could not be read', {
      extensions: { code: 'AI_INVALID_JSON' },
    });
  }

  const answer = text(parsed.answer);
  if (!answer) {
    throw new GraphQLError('The bot returned an empty answer', {
      extensions: { code: 'AI_EMPTY_RESPONSE' },
    });
  }

  return {
    answer,
    links: await resolveLinks(parsed.links, userId, req),
    followups: stringList(parsed.followups, MAX_FOLLOWUPS),
  };
}

export const askBotService = { listBots, chat };
