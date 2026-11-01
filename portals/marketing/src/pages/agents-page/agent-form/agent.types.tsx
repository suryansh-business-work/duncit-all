import { z } from 'zod';
import { fallbackT, type Translate } from '@duncit/shell';
import { PLATFORMS } from '../../social-accounts-page/copy';
import type { SocialPlatform } from '../../social-accounts-page/queries';
import type { MarketingAgent, MarketingAgentCadence, UpdateMarketingAgentInput } from '../queries';

/**
 * The bounds, stated here as well as on the server so the manager is told
 * before they submit. The server refuses anything outside them either way —
 * see agent.catalog.ts, which owns the real rule.
 */
export const MAX_BRIEF = 500;
export const MAX_POSTS_PER_WEEK = 7;
const HOURS_IN_DAY = 24;
const DAYS_IN_WEEK = 7;

const CADENCES = ['DAY', 'WEEK'] as const satisfies readonly MarketingAgentCadence[];
const PLATFORM_VALUES = [...PLATFORMS] as [SocialPlatform, ...SocialPlatform[]];

/** What the fields hold: the count is typed as the text field gives it and read as a number on submit. */
export interface AgentFormValues {
  every: MarketingAgentCadence;
  hour: number;
  weekday: number;
  brief: string;
  networks: SocialPlatform[];
  posts_per_week: string;
}

const wholeNumber = (value: string) => value !== '' && Number.isInteger(Number(value));

export const agentFormSchema = (t: Translate = fallbackT) =>
  z.object({
    every: z.enum(CADENCES),
    hour: z.number().int().min(0).max(HOURS_IN_DAY - 1),
    weekday: z.number().int().min(0).max(DAYS_IN_WEEK - 1),
    brief: z.string().trim().max(MAX_BRIEF, t('marketing.agents.briefTooLong', { vars: { max: String(MAX_BRIEF) } })),
    networks: z.array(z.enum(PLATFORM_VALUES)),
    posts_per_week: z
      .string()
      .trim()
      .refine(wholeNumber, t('marketing.agents.postsNotWhole'))
      .transform(Number)
      .pipe(
        z
          .number()
          .min(1, t('marketing.agents.postsTooFew'))
          .max(MAX_POSTS_PER_WEEK, t('marketing.agents.postsTooMany', { vars: { max: String(MAX_POSTS_PER_WEEK) } })),
      ),
  });

export type AgentFormOutput = z.output<ReturnType<typeof agentFormSchema>>;

export function toFormValues(agent: MarketingAgent): AgentFormValues {
  return {
    every: agent.schedule.every,
    hour: agent.schedule.hour,
    weekday: agent.schedule.weekday,
    brief: agent.params.brief,
    networks: [...agent.params.networks],
    posts_per_week: String(agent.params.posts_per_week),
  };
}

/** The schedule always; the params only for an agent that reads them. */
export function toUpdateInput(values: AgentFormOutput, hasParams: boolean): UpdateMarketingAgentInput {
  const input: UpdateMarketingAgentInput = { schedule: { every: values.every, hour: values.hour, weekday: values.weekday } };
  if (hasParams) input.params = { brief: values.brief, networks: values.networks, posts_per_week: values.posts_per_week };
  return input;
}

export interface AgentFormProps {
  agent: MarketingAgent;
  /** Fields shown but not editable, and no Save — an editor's view. */
  readOnly: boolean;
  busy: boolean;
  onSubmit: (values: AgentFormOutput) => Promise<boolean> | boolean;
}
