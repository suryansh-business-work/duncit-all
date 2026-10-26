import {
  buildASTSchema,
  concatAST,
  getNamedType,
  isLeafType,
  isObjectType,
  Kind,
  parse,
  type DocumentNode,
  type GraphQLField,
  type GraphQLSchema,
} from 'graphql';
import { fieldInvocation, selectionOf, type SdlSource } from '@modules/platform/tableApi/tableApi.operation';
import type { GraphQLTool, SkippedField } from '../tools/tool.types';
import { categoryLabel, MODULE_CATEGORY, type McpCategoryKey, type ModuleName } from './categories';
import { deniedReason } from './denylist';
import { clip, objectSchema } from './json-schema';
import { withMetaParams } from './meta-params';
import { titleOf, toolNameFor } from './naming';
import { needsConfirmation, reachesOutside, riskOf, type OperationKind, type ToolRisk } from './risk';
import { isSensitiveName } from './sensitivity';

/**
 * One MCP tool per Query and Mutation field the API exposes.
 *
 * The operation is derived from the schema the way the table GET API derives
 * its reads (tableApi.operation.ts): every argument becomes a variable of the
 * same name, and the result selects every plain field of the return type,
 * following embedded objects a few levels down but never a field with its own
 * resolver — so a list of a hundred rows can never fan out into a hundred
 * lookups. Fields named like credentials are never selected.
 *
 * Because each tool IS a portal operation, running it is indistinguishable
 * from the console doing it: the same resolver, the same permission check, the
 * same pod history, audit rows and notifications.
 */

type ResolverMap = Readonly<Record<string, unknown>>;

export interface CatalogSource {
  typeDefsByModule: Readonly<Record<string, SdlSource>>;
  resolvers: ReadonlyArray<ResolverMap>;
}

const ROOTS: ReadonlyArray<readonly [OperationKind, 'Query' | 'Mutation', 'query' | 'mutation']> = [
  ['QUERY', 'Query', 'query'],
  ['MUTATION', 'Mutation', 'mutation'],
];

const SELECTION_DEPTH = 3;
const NOT_EXPOSED = 'its module is not exposed to MCP';

const toDocument = (sdl: SdlSource): DocumentNode => (typeof sdl === 'string' ? parse(sdl) : sdl);

/** `QUERY:podsTable` → the module whose SDL declares it. */
function fieldModules(typeDefsByModule: CatalogSource['typeDefsByModule']): Map<string, string> {
  const owners = new Map<string, string>();
  for (const [module, sdl] of Object.entries(typeDefsByModule)) {
    for (const definition of toDocument(sdl).definitions) {
      if (definition.kind !== Kind.OBJECT_TYPE_DEFINITION && definition.kind !== Kind.OBJECT_TYPE_EXTENSION) continue;
      const root = ROOTS.find(([, typeName]) => typeName === definition.name.value);
      if (!root) continue;
      for (const field of definition.fields ?? []) owners.set(`${root[0]}:${field.name.value}`, module);
    }
  }
  return owners;
}

function selectionFor(
  field: GraphQLField<unknown, unknown>,
  hasResolver: (typeName: string, fieldName: string) => boolean
): string {
  const named = getNamedType(field.type);
  if (isLeafType(named)) return '';
  if (!isObjectType(named)) return ' { __typename }';
  const inner = selectionOf(named, 1, hasResolver, { maxDepth: SELECTION_DEPTH, includeLeaf: isSelectableLeaf });
  return ` { ${inner || '__typename'} }`;
}

/**
 * A flag is never a credential (`has_api_key`, `is_token_valid`), so a Boolean
 * is always selected. Numbers are NOT exempt: an OTP, a PIN or a CVV can be an
 * Int. Token counts are let through by name instead (sensitivity.ts).
 */
export function isSelectableLeaf(field: GraphQLField<unknown, unknown>): boolean {
  return getNamedType(field.type).name === 'Boolean' || !isSensitiveName(field.name);
}

const RISK_LABEL: Record<ToolRisk, string> = {
  READ: 'Read-only',
  WRITE: 'Writes data',
  DESTRUCTIVE: 'Destructive',
};

function describe(
  field: GraphQLField<unknown, unknown>,
  kind: OperationKind,
  category: McpCategoryKey,
  risk: ToolRisk,
  confirm: boolean
): string {
  const summary = clip(field.description, 700) ?? `${titleOf(field.name)}.`;
  const parts = [`[${categoryLabel(category)} · ${RISK_LABEL[risk]}] ${summary}`];
  parts.push(
    `Runs the Duncit GraphQL ${kind === 'QUERY' ? 'query' : 'mutation'} \`${field.name}\` with the signed-in person's own permissions, exactly as their console would.`
  );
  if (risk !== 'READ') {
    parts.push('It has the same side effects as doing it in the console (history, audit log, notifications).');
  }
  if (confirm) {
    parts.push('Tell the user exactly what will happen and only call it with mcp_confirm: true after they say yes.');
  }
  if (field.deprecationReason) parts.push(`Deprecated: ${field.deprecationReason}`);
  return parts.join(' ');
}

function toolFor(
  field: GraphQLField<unknown, unknown>,
  kind: OperationKind,
  operation: 'query' | 'mutation',
  module: ModuleName,
  category: McpCategoryKey,
  hasResolver: (typeName: string, fieldName: string) => boolean
): GraphQLTool {
  const risk = riskOf(kind, field.name);
  const confirm = needsConfirmation(kind, field.name);
  const operationName = `Mcp_${field.name}`;
  const { signature, call } = fieldInvocation(field);
  const document = parse(`${operation} ${operationName}${signature} { ${call}${selectionFor(field, hasResolver)} }`);
  return {
    source: 'graphql',
    name: toolNameFor(category, field.name),
    title: titleOf(field.name),
    description: describe(field, kind, category, risk, confirm),
    category,
    kind,
    risk,
    confirm,
    outward: reachesOutside(kind, field.name),
    inputSchema: withMetaParams(objectSchema(field.args, 0), risk, confirm),
    field: field.name,
    module,
    document,
    operationName,
    argNames: field.args.map((arg) => arg.name),
  };
}

export interface BuiltGraphQLTools {
  schema: GraphQLSchema;
  tools: GraphQLTool[];
  skipped: SkippedField[];
}

export function buildGraphQLTools({ typeDefsByModule, resolvers }: CatalogSource): BuiltGraphQLTools {
  const schema = buildASTSchema(concatAST(Object.values(typeDefsByModule).map(toDocument)), {
    assumeValidSDL: true,
  });
  const owners = fieldModules(typeDefsByModule);
  const hasResolver = (typeName: string, fieldName: string) =>
    resolvers.some((map) => Boolean((map[typeName] as ResolverMap | undefined)?.[fieldName]));
  const tools: GraphQLTool[] = [];
  const skipped: SkippedField[] = [];

  for (const [kind, typeName, operation] of ROOTS) {
    const root = typeName === 'Query' ? schema.getQueryType() : schema.getMutationType();
    for (const field of Object.values(root?.getFields() ?? {})) {
      // A root type not called Query/Mutation (`schema { query: Root }`) has no owner.
      const module = owners.get(`${kind}:${field.name}`) ?? 'unknown';
      const category = MODULE_CATEGORY[module as ModuleName] ?? null;
      if (!category) {
        skipped.push({ field: field.name, kind, module, reason: NOT_EXPOSED });
        continue;
      }
      const denied = deniedReason(field.name);
      if (denied) {
        skipped.push({ field: field.name, kind, module, reason: denied });
        continue;
      }
      tools.push(toolFor(field, kind, operation, module as ModuleName, category, hasResolver));
    }
  }
  return { schema, tools, skipped };
}
