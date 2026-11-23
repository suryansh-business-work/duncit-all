import { z } from 'zod';
import { intField, type Translate } from '../fields';

/** Settings › Access & Permissions (Super Admin only) — what Employees and Admins may reach. */

export const ENVIRONMENTS = ['STAGING', 'PRODUCTION'] as const;
export const SOURCES = ['MONGODB', 'MCP', 'GITHUB', 'SLACK', 'GMAIL', 'MEDIA'] as const;

const policy = (t: Translate) =>
  z.object({
    environments: z.array(z.enum(ENVIRONMENTS)),
    sources: z.array(z.enum(SOURCES)),
    can_request_writes: z.boolean(),
    messages_per_day: intField(t, 0, 100000),
  });

export const makeAccessSchema = (t: Translate) => z.object({ employee: policy(t), admin: policy(t) });

export type AccessValues = z.input<ReturnType<typeof makeAccessSchema>>;
export type AccessOutput = z.output<ReturnType<typeof makeAccessSchema>>;
