import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { z } from 'zod';
import { logs } from '@observability/log';
import { MCP_CATEGORIES } from '../catalog/categories';
import { GUARD_MODES, TOOL_NAME_PATTERN } from '../mcp.constants';
import { McpSettingsModel, type IMcpSettings } from './settings.model';
import type { McpSettingsInput, McpSettingsValue } from './settings.types';

/**
 * The MCP settings, read on every tool call — so the read is cached for a few
 * seconds per process. A change made in the console reaches this process at
 * once (the cache is dropped on update) and every other process within the
 * cache window, which is the right trade for a kill switch: seconds, not a deploy.
 */

const CACHE_MS = 15_000;
const HOST = /^(\[[0-9a-f:]+\]|[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*)$/;
const CATEGORY_KEYS = MCP_CATEGORIES.map((c) => c.key) as [string, ...string[]];

const inputSchema = z
  .object({
    write_tools_enabled: z.boolean(),
    default_injection_guard: z.enum(GUARD_MODES),
    disabled_tools: z.array(z.string().regex(TOOL_NAME_PATTERN, 'Not a tool name')).max(1000),
    disabled_categories: z.array(z.enum(CATEGORY_KEYS)).max(CATEGORY_KEYS.length),
    // z.number() already refuses NaN and ±Infinity in zod 4.
    token_price_input_per_million: z.number().min(0).max(100_000),
    token_price_output_per_million: z.number().min(0).max(100_000),
    currency: z.string().regex(/^[A-Z]{3}$/, 'Use a three-letter currency code, e.g. USD'),
    trusted_redirect_hosts: z
      .array(z.string().trim().toLowerCase().regex(HOST, 'Not a host name'))
      .min(1, 'Keep at least one trusted host')
      .max(200),
    allow_untrusted_clients: z.boolean(),
  })
  .partial()
  .strict();

let cached: { value: McpSettingsValue; at: number } | null = null;

function toValue(doc: IMcpSettings): McpSettingsValue {
  return {
    write_tools_enabled: doc.write_tools_enabled,
    default_injection_guard: doc.default_injection_guard,
    disabled_tools: [...doc.disabled_tools],
    disabled_categories: [...doc.disabled_categories],
    token_price_input_per_million: doc.token_price_input_per_million,
    token_price_output_per_million: doc.token_price_output_per_million,
    currency: doc.currency,
    trusted_redirect_hosts: [...doc.trusted_redirect_hosts],
    allow_untrusted_clients: doc.allow_untrusted_clients,
    updated_at: doc.updated_at.toISOString(),
    updated_by: doc.updated_by ? String(doc.updated_by) : null,
  };
}

/** The settings document, created with its defaults the first time it is asked for. */
async function load(): Promise<IMcpSettings> {
  return McpSettingsModel.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).orFail();
}

export const mcpSettingsService = {
  async get(): Promise<McpSettingsValue> {
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
    const value = toValue(await load());
    cached = { value, at: Date.now() };
    return value;
  },

  async update(input: McpSettingsInput, actorId: string): Promise<McpSettingsValue> {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) {
      throw new GraphQLError(parsed.error.issues.map((issue) => issue.message).join('; '), {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const before = toValue(await load());
    const doc = await McpSettingsModel.findOneAndUpdate(
      { key: 'default' },
      { $set: { ...parsed.data, updated_by: new Types.ObjectId(actorId) } },
      { new: true }
    ).orFail();
    const value = toValue(doc);
    cached = { value, at: Date.now() };
    const changed = Object.keys(parsed.data);
    logs.server.warn('mcp', 'settingsUpdated', {
      actorId,
      changed,
      before: Object.fromEntries(changed.map((key) => [key, before[key as keyof McpSettingsValue]])),
      after: Object.fromEntries(changed.map((key) => [key, value[key as keyof McpSettingsValue]])),
    });
    return value;
  },

  /** Tests and the update path only. */
  clearCache(): void {
    cached = null;
  },
};
