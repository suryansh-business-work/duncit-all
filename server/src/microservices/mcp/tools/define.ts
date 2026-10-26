import { z } from 'zod';
import type { McpCategoryKey } from '../catalog/categories';
import type { JsonSchema } from '../catalog/json-schema';
import { withMetaParams } from '../catalog/meta-params';
import type { ToolRisk } from '../catalog/risk';
import { ToolInputError } from '../execute/validate';
import type { CuratedTool, ToolAnnotationOverrides, ToolContext } from './tool.types';

/**
 * A hand-written tool from a zod schema: the schema is both what the AI is
 * shown (as JSON Schema, with the meta parameters added) and what the call is
 * checked against before `run` sees it.
 */

export interface ToolSpec<S extends z.ZodObject> {
  name: string;
  title: string;
  description: string;
  category: McpCategoryKey;
  risk?: ToolRisk;
  confirm?: boolean;
  outward?: boolean;
  listedOn: readonly string[];
  annotations?: ToolAnnotationOverrides;
  schema: S;
  run(context: ToolContext, args: z.infer<S>): Promise<unknown>;
}

/** The JSON Schema a client is shown. `io: 'input'` keeps defaulted fields optional. */
export function jsonSchemaOf(schema: z.ZodObject): JsonSchema {
  const json = { ...(z.toJSONSchema(schema, { io: 'input' }) as JsonSchema & { $schema?: string }) };
  // The dialect URI means nothing to an MCP client and costs tokens on every tools/list.
  delete json.$schema;
  return json;
}

export function issuesText(error: z.ZodError): string {
  return error.issues
    .map((issue) => (issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
    .join('; ');
}

export function defineTool<S extends z.ZodObject>(spec: ToolSpec<S>): CuratedTool {
  const risk = spec.risk ?? 'READ';
  const confirm = spec.confirm ?? false;
  return {
    source: 'curated',
    kind: 'CURATED',
    name: spec.name,
    title: spec.title,
    description: spec.description,
    category: spec.category,
    risk,
    confirm,
    outward: spec.outward ?? false,
    listedOn: spec.listedOn,
    annotations: spec.annotations,
    inputSchema: withMetaParams(jsonSchemaOf(spec.schema), risk, confirm),
    async run(context, args) {
      const parsed = spec.schema.safeParse(args);
      if (!parsed.success) throw new ToolInputError('INVALID_ARGUMENTS', issuesText(parsed.error));
      return spec.run(context, parsed.data);
    },
  };
}
