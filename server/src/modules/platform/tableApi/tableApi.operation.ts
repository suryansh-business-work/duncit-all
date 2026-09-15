import {
  buildASTSchema,
  concatAST,
  getNamedType,
  getNullableType,
  isEnumType,
  isLeafType,
  isListType,
  isNonNullType,
  isObjectType,
  parse,
  type DocumentNode,
  type GraphQLField,
  type GraphQLObjectType,
  type GraphQLSchema,
} from 'graphql';

/**
 * Turns a `<name>Table` Query field into the one read the table GET API runs.
 *
 * Every portal table is backed by a `<name>Table(query: TableQueryInput, …)`
 * field returning `{ rows, total }`. Rather than a hand-written REST route per
 * table, the operation is derived from the schema itself: the field's own
 * arguments become variables, and the row selection is every plain field of the
 * row type. That keeps resolver authorization exactly as it is — the same
 * resolver answers the portal and the URL — and a new table needs no server
 * work to gain a GET API.
 *
 * Nested objects are followed only where no custom resolver sits on the field
 * (embedded data, already loaded with the row) and only a few levels deep, so a
 * page of 100 rows can never fan out into a per-row lookup the portal never asked for.
 */

type ResolverMap = Readonly<Record<string, unknown>>;
export type SdlSource = string | DocumentNode;

const MAX_DEPTH = 3;
const TABLE_SUFFIX = 'Table';
const PAGE_LEAVES = ['total', 'page', 'page_size'];
/** The shared paging/sort/filter input every `<name>Table` query takes. */
export const TABLE_QUERY_ARG_TYPE = 'TableQueryInput';

export interface TableOperation {
  document: DocumentNode;
  operationName: string;
  field: GraphQLField<unknown, unknown>;
}

function hasRequiredArgs(field: GraphQLField<unknown, unknown>): boolean {
  return field.args.some((arg) => isNonNullType(arg.type) && arg.defaultValue === undefined);
}

function selectionOf(
  type: GraphQLObjectType,
  depth: number,
  hasResolver: (typeName: string, fieldName: string) => boolean
): string {
  const parts: string[] = [];
  for (const field of Object.values(type.getFields())) {
    if (hasRequiredArgs(field)) continue;
    const named = getNamedType(field.type);
    if (isLeafType(named)) {
      parts.push(field.name);
    } else if (isObjectType(named) && depth < MAX_DEPTH && !hasResolver(type.name, field.name)) {
      const inner = selectionOf(named, depth + 1, hasResolver);
      if (inner) parts.push(`${field.name} { ${inner} }`);
    }
  }
  return parts.join(' ');
}

/** The `{ rows, total }` page type a table field returns, or null when the field is not a table. */
function pageTypeOf(field: GraphQLField<unknown, unknown>): GraphQLObjectType | null {
  const page = getNamedType(field.type);
  if (!isObjectType(page)) return null;
  const { rows, total } = page.getFields();
  if (!rows || !total || !isObjectType(getNamedType(rows.type))) return null;
  return page;
}

function buildOperation(
  schema: GraphQLSchema,
  fieldName: string,
  hasResolver: (typeName: string, fieldName: string) => boolean
): TableOperation | null {
  const field = schema.getQueryType()?.getFields()[fieldName];
  if (!field || !fieldName.endsWith(TABLE_SUFFIX)) return null;
  const page = pageTypeOf(field);
  if (!page) return null;
  const rowType = getNamedType(page.getFields().rows.type) as GraphQLObjectType;
  const pageFields = page.getFields();
  const leaves = PAGE_LEAVES.filter((name) => pageFields[name] && isLeafType(getNamedType(pageFields[name].type)));
  const variables = field.args.map((arg) => `$${arg.name}: ${arg.type.toString()}`).join(', ');
  const args = field.args.map((arg) => `${arg.name}: $${arg.name}`).join(', ');
  const operationName = `TableApi_${fieldName}`;
  const signature = variables ? `(${variables})` : '';
  const call = args ? `${fieldName}(${args})` : fieldName;
  const rows = selectionOf(rowType, 1, hasResolver);
  const text = `query ${operationName}${signature} { ${call} { rows { ${rows} } ${leaves.join(' ')} } }`;
  return { document: parse(text), operationName, field };
}

/** One schema and one operation cache per server process — the SDL does not change at runtime. */
export function createTableOperations(typeDefs: ReadonlyArray<SdlSource>, resolvers: ReadonlyArray<ResolverMap>) {
  let schema: GraphQLSchema | null = null;
  const cache = new Map<string, TableOperation | null>();
  const hasResolver = (typeName: string, fieldName: string) =>
    resolvers.some((map) => Boolean((map[typeName] as ResolverMap | undefined)?.[fieldName]));

  return {
    get(fieldName: string): TableOperation | null {
      if (cache.has(fieldName)) return cache.get(fieldName) ?? null;
      schema ??= buildASTSchema(
        concatAST(typeDefs.map((sdl) => (typeof sdl === 'string' ? parse(sdl) : sdl))),
        { assumeValidSDL: true }
      );
      const operation = buildOperation(schema, fieldName, hasResolver);
      cache.set(fieldName, operation);
      return operation;
    },
  };
}

/** Whether an argument's value is taken from the query string verbatim (text, ids, enums) or parsed as JSON. */
export function isTextArg(field: GraphQLField<unknown, unknown>, argName: string): boolean {
  const arg = field.args.find((candidate) => candidate.name === argName);
  if (!arg) return true;
  if (isListType(getNullableType(arg.type))) return false;
  const named = getNamedType(arg.type);
  return isEnumType(named) || named.name === 'String' || named.name === 'ID';
}
