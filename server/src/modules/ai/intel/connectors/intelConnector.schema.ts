import { z } from 'zod';
import { INTEL_CONNECTOR_KINDS, INTEL_ENV_CHOICES, MONGO_ACCESS_MODES, type IntelConnectorKind } from '../intel.constants';

/**
 * Validation for connector create/update, per kind. The same shape the
 * console's connector forms submit; refused here with field messages before
 * anything is saved, whatever client sent it (console, script or MCP).
 */

const ghName = z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_.-]+$/, 'Letters, digits, dot, dash or underscore');
const branch = z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9._/-]+$/, 'A branch name such as staging');
const collectionName = z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9_.-]+$/, 'A collection name').refine((n) => !n.startsWith('system.'), 'System collections cannot be used');

export const CONFIG_SCHEMAS: Record<IntelConnectorKind, z.ZodType<Record<string, unknown>>> = {
  MONGODB: z.object({
    database: z.string().trim().max(64).regex(/^[A-Za-z0-9_-]*$/, 'A database name').default(''),
    collections: z.array(collectionName).max(300).default([]),
    access_mode: z.enum(MONGO_ACCESS_MODES).default('READ_ONLY'),
  }),
  MCP: z.object({}).passthrough().default({}),
  SLACK: z.object({
    channels: z.array(z.object({ id: z.string().trim().regex(/^[CGD][A-Z0-9]{6,20}$/, 'A Slack channel id'), name: z.string().trim().max(120) })).max(200).default([]),
    include_threads: z.boolean().default(true),
    index_attachments: z.boolean().default(false),
    history_days: z.number().int().min(1).max(3650).default(90),
  }),
  GMAIL: z.object({
    query: z.string().trim().max(300).default('in:inbox'),
    max_threads: z.number().int().min(10).max(5000).default(500),
    include_attachments: z.boolean().default(false),
    history_days: z.number().int().min(1).max(3650).default(90),
  }),
  GITHUB: z.object({
    repos: z
      .array(
        z.object({
          owner: ghName,
          repo: ghName,
          branch,
          code: z.boolean().default(true),
          docs: z.boolean().default(true),
          issues: z.boolean().default(true),
          prs: z.boolean().default(true),
          commits: z.boolean().default(true),
        })
      )
      .min(1, 'Add at least one repository')
      .max(20),
  }),
};

export const connectorInputSchema = z
  .object({
    kind: z.enum(INTEL_CONNECTOR_KINDS),
    name: z.string().trim().min(2, 'Name is required').max(80),
    environment: z.enum(INTEL_ENV_CHOICES),
    env_entry_id: z.string().trim().regex(/^[a-f0-9]{24}$/i, 'Choose a Tech portal entry'),
    enabled: z.boolean().default(true),
    config: z.record(z.string(), z.unknown()).default({}),
  })
  .refine((c) => c.kind !== 'MONGODB' || c.environment !== 'BOTH', {
    message: 'A database is one environment — add a second connection for the other.',
    path: ['environment'],
  });

export type ConnectorInput = z.infer<typeof connectorInputSchema>;
