/**
 * The catalog contract: the REAL catalog, built from the API's own typeDefs
 * and resolvers exactly as the server builds it, with every tool held to the
 * rules an MCP client and Duncit's safety model rely on. A new API field that
 * breaks one of them fails here, named, before it reaches an AI.
 */
import {
  Kind,
  getNamedType,
  isNonNullType,
  isObjectType,
  validate,
  type GraphQLField,
  type GraphQLNamedType,
  type OperationDefinitionNode,
  type SelectionSetNode,
} from 'graphql';
import { resolvers, typeDefsByModule } from '@modules/index';
import { annotationsFor } from '../../catalog/annotations';
import { getCatalog, registerCatalogSource } from '../../catalog/catalog';
import { categoryLabel, MODULE_CATEGORY } from '../../catalog/categories';
import { deniedReason } from '../../catalog/denylist';
import { endpointsForCategory, MCP_ENDPOINTS } from '../../catalog/endpoints';
import { isSensitiveName } from '../../catalog/sensitivity';
import { parseCallArgs, ToolInputError } from '../../execute/validate';
import { GATEWAY_ENDPOINT, META_CONFIRM, META_GUARD, META_PARAMS, META_REASON, TOOL_NAME_PATTERN } from '../../mcp.constants';
import { MCP_PROMPTS } from '../../server/prompts';
import { CURATED_TOOLS } from '../../tools/curated';
import { runSelfTest } from '../../tools/meta/self-test.tool';
import type { GraphQLTool, McpTool } from '../../tools/tool.types';

registerCatalogSource({ typeDefsByModule, resolvers });
const catalog = getCatalog();

const RISK_LABEL = { READ: 'Read-only', WRITE: 'Writes data', DESTRUCTIVE: 'Destructive' } as const;
const META = new Set<string>(META_PARAMS);
const ENDPOINT_KEYS = new Set<string>([GATEWAY_ENDPOINT, '*', ...MCP_ENDPOINTS.map((endpoint) => endpoint.key)]);

const nameCounts = new Map<string, number>();
for (const tool of catalog.tools) nameCounts.set(tool.name, (nameCounts.get(tool.name) ?? 0) + 1);

function rootField(tool: GraphQLTool): GraphQLField<unknown, unknown> {
  const root = tool.kind === 'QUERY' ? catalog.schema.getQueryType() : catalog.schema.getMutationType();
  const field = root?.getFields()[tool.field];
  if (!field) throw new Error(`${tool.name}: ${tool.field} is not on the ${tool.kind} type`);
  return field;
}

function operationOf(tool: GraphQLTool): OperationDefinitionNode {
  const [definition] = tool.document.definitions;
  if (definition.kind !== Kind.OPERATION_DEFINITION) throw new Error(`${tool.name}: not an operation`);
  return definition;
}

/** Every selected leaf below the root field, as its schema definition (`__typename` has none). */
function selectedLeaves(
  type: GraphQLNamedType,
  selectionSet: SelectionSetNode | undefined,
  out: Array<GraphQLField<unknown, unknown>> = []
): Array<GraphQLField<unknown, unknown>> {
  if (!isObjectType(type)) return out;
  for (const selection of selectionSet?.selections ?? []) {
    if (selection.kind !== Kind.FIELD) continue;
    const field = type.getFields()[selection.name.value];
    if (!field) continue;
    if (selection.selectionSet) selectedLeaves(getNamedType(field.type), selection.selectionSet, out);
    else out.push(field);
  }
  return out;
}

const ownParameters = (tool: McpTool) => Object.keys(tool.inputSchema.properties).filter((key) => !META.has(key));
const ownRequired = (tool: McpTool) => (tool.inputSchema.required ?? []).filter((key) => !META.has(key));

/** The meta parameters a call needs to get past the reason and confirmation checks. */
function metaArgs(tool: McpTool): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  if (tool.risk !== 'READ') args[META_REASON] = 'Catalog contract test call.';
  if (tool.confirm) args[META_CONFIRM] = true;
  return args;
}

function inputError(run: () => unknown): ToolInputError | null {
  try {
    run();
    return null;
  } catch (error) {
    if (error instanceof ToolInputError) return error;
    throw error;
  }
}

describe('the catalog as a whole', () => {
  it('holds the whole API (about two thousand tools) plus every curated tool', () => {
    expect(catalog.tools.length).toBeGreaterThan(1500);
    for (const curated of CURATED_TOOLS) expect(catalog.byName.get(curated.name)).toBe(curated);
  });

  it('has no two tools with the same name', () => {
    expect([...nameCounts.entries()].filter(([, count]) => count > 1)).toEqual([]);
  });

  it('passes its own self-test', () => {
    const failing = runSelfTest(catalog, catalog.tools).filter((check) => !check.ok);
    expect(failing).toEqual([]);
  });

  it('builds no tool from a module that is kept out of MCP', () => {
    const hidden = catalog.tools.filter((tool) => tool.source === 'graphql' && MODULE_CATEGORY[tool.module] === null);
    expect(hidden.map((tool) => tool.name)).toEqual([]);
  });

  it('never exposes the MCP console’s own consent and settings decisions', () => {
    const fields = new Set(catalog.tools.flatMap((tool) => (tool.source === 'graphql' ? [tool.field] : [])));
    for (const field of ['approveMcpAuthorization', 'denyMcpAuthorization', 'revokeMcpConnection', 'updateMcpSettings', 'mcpAuthorizationRequest']) {
      expect({ field, exposed: fields.has(field) }).toEqual({ field, exposed: false });
    }
  });

  it('reports every skipped field with a reason and never also builds it', () => {
    const built = new Set(catalog.tools.flatMap((tool) => (tool.source === 'graphql' ? [`${tool.kind}:${tool.field}`] : [])));
    for (const skipped of catalog.skipped) {
      expect(skipped.reason.length).toBeGreaterThan(5);
      expect(built.has(`${skipped.kind}:${skipped.field}`)).toBe(false);
    }
  });

  it.each(MCP_PROMPTS.map((prompt) => [prompt.name, prompt.tools] as const))('prompt %s names only tools that exist', (_name, tools) => {
    expect(tools.filter((name) => !catalog.byName.has(name))).toEqual([]);
  });
});

describe.each(catalog.tools.map((tool) => [tool.name, tool] as const))('%s', (_name, tool) => {
  const label = categoryLabel(tool.category);

  it('has a valid MCP tool name of at most 64 characters', () => {
    expect(tool.name).toMatch(TOOL_NAME_PATTERN);
  });

  it('is the only tool with its name', () => {
    expect(nameCounts.get(tool.name)).toBe(1);
    expect(catalog.byName.get(tool.name)).toBe(tool);
  });

  it('says what it does, tagged with its category and risk', () => {
    expect(tool.description.trim().length).toBeGreaterThanOrEqual(20);
    const tag = /^\[([^\]]+)\]/.exec(tool.description)?.[1];
    // mcp_call_tool may run any tool, so it claims no single risk of its own.
    const claimsNoRisk = tool.source === 'curated' && tool.annotations?.readOnlyHint === false;
    expect(tag).toBe(claimsNoRisk ? label : `${label} · ${RISK_LABEL[tool.risk]}`);
  });

  it('takes a closed object of parameters that includes mcp_reason and mcp_guard', () => {
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.additionalProperties).toBe(false);
    expect(tool.inputSchema.properties).toHaveProperty(META_REASON);
    expect(tool.inputSchema.properties).toHaveProperty(META_GUARD);
  });

  it('requires mcp_reason exactly when it can change data', () => {
    expect((tool.inputSchema.required ?? []).includes(META_REASON)).toBe(tool.risk !== 'READ');
  });

  it('takes and requires mcp_confirm exactly when it needs the person’s yes', () => {
    expect(META_CONFIRM in tool.inputSchema.properties).toBe(tool.confirm);
    expect((tool.inputSchema.required ?? []).includes(META_CONFIRM)).toBe(tool.confirm);
    if (tool.risk === 'DESTRUCTIVE') expect(tool.confirm).toBe(true);
  });

  it('has no parameter of its own that collides with a meta parameter', () => {
    const own = ownParameters(tool);
    expect(own.filter((key) => key.startsWith('mcp_'))).toEqual([]);
    if (tool.source === 'graphql') {
      expect(tool.argNames.filter((name) => META.has(name))).toEqual([]);
      expect(own).toEqual([...tool.argNames]);
    }
  });

  it('requires only parameters it declares, and exactly the GraphQL arguments that are required', () => {
    const own = ownParameters(tool);
    expect(ownRequired(tool).filter((key) => !own.includes(key))).toEqual([]);
    if (tool.source === 'graphql') {
      const required = rootField(tool)
        .args.filter((arg) => isNonNullType(arg.type) && arg.defaultValue === undefined)
        .map((arg) => arg.name);
      expect(ownRequired(tool)).toEqual(required);
    }
  });

  it('runs a GraphQL document valid against the schema being served (or its own code)', () => {
    if (tool.source === 'curated') {
      expect(typeof tool.run).toBe('function');
      return;
    }
    expect(validate(catalog.schema, tool.document)).toEqual([]);
  });

  it('runs the operation its kind says, annotated to match its risk', () => {
    const annotations = annotationsFor(tool);
    if (tool.source === 'curated') {
      expect(tool.kind).toBe('CURATED');
      if (!tool.annotations) expect(annotations.readOnlyHint).toBe(tool.risk === 'READ');
      return;
    }
    const operation = operationOf(tool);
    expect(operation.operation).toBe(tool.kind === 'QUERY' ? 'query' : 'mutation');
    expect(operation.name?.value).toBe(tool.operationName);
    expect(tool.operationName).toBe(`Mcp_${tool.field}`);
    const [selection] = operation.selectionSet.selections;
    expect(selection.kind === Kind.FIELD ? selection.name.value : null).toBe(tool.field);
    expect(tool.risk === 'READ').toBe(tool.kind === 'QUERY');
    expect(annotations.readOnlyHint).toBe(tool.risk === 'READ');
    expect(annotations.destructiveHint).toBe(tool.risk === 'DESTRUCTIVE');
  });

  it('comes from an exposed field of a module filed under its category', () => {
    if (tool.source === 'curated') {
      expect(tool.listedOn.length).toBeGreaterThan(0);
      return;
    }
    expect(deniedReason(tool.field)).toBeNull();
    expect(MODULE_CATEGORY[tool.module]).toBe(tool.category);
    expect(rootField(tool).name).toBe(tool.field);
  });

  it('never selects a credential into its result (only a Boolean flag may carry such a name)', () => {
    if (tool.source === 'curated') return;
    const [selection] = operationOf(tool).selectionSet.selections;
    const leaves = selection.kind === Kind.FIELD ? selectedLeaves(getNamedType(rootField(tool).type), selection.selectionSet) : [];
    const credentials = leaves.filter((field) => getNamedType(field.type).name !== 'Boolean' && isSensitiveName(field.name));
    expect(credentials.map((field) => field.name)).toEqual([]);
  });

  it('is served on at least one connector', () => {
    if (tool.source === 'curated') {
      expect(tool.listedOn.filter((key) => !ENDPOINT_KEYS.has(key))).toEqual([]);
      return;
    }
    expect(endpointsForCategory(tool.category).length).toBeGreaterThan(0);
  });

  it('rejects a parameter it does not declare', () => {
    const error = inputError(() => parseCallArgs(tool, { ...metaArgs(tool), mcp_not_a_parameter: 1 }));
    expect(error?.code).toBe('INVALID_ARGUMENTS');
    expect(error?.message).toMatch(/^Unknown parameter: mcp_not_a_parameter\./);
  });

  it('rejects a call missing a required argument, or accepts one with only the meta parameters', () => {
    const required = ownRequired(tool);
    const error = inputError(() => parseCallArgs(tool, metaArgs(tool)));
    if (required.length) {
      expect(error?.code).toBe('INVALID_ARGUMENTS');
      expect(error?.message).toBe(`Missing required parameter${required.length > 1 ? 's' : ''}: ${required.join(', ')}.`);
    } else {
      expect(error).toBeNull();
    }
  });
});
