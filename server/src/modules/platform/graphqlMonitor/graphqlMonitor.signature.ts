import { createHash } from 'node:crypto';
import {
  Kind,
  TypeInfo,
  print,
  stripIgnoredCharacters,
  visit,
  visitWithTypeInfo,
  type DefinitionNode,
  type DocumentNode,
  type GraphQLSchema,
  type OperationDefinitionNode,
} from 'graphql';

/**
 * What identifies "one operation" across millions of requests.
 *
 * Grouping by operation NAME alone would fold two different documents that
 * happen to share a name into one row, and grouping by the raw query text would
 * split one operation into thousands whenever a client inlines a literal. So,
 * like Apollo GraphOS, an operation is keyed by its SIGNATURE: the executed
 * operation plus the fragments beside it, literals blanked, whitespace removed.
 *
 * Working this out prints and walks the document, which is not free, so the
 * answer is memoised per query text — a client sends the same few hundred
 * documents over and over.
 */

export interface OperationShape {
  op_key: string;
  name: string;
  type: string;
  signature: string;
  root_fields: string[];
  /** Every `Type.field` the document selects — what the Fields page counts. */
  fields: string[];
}

/** Longest signature kept on the registry row. A document past this is still counted. */
const MAX_SIGNATURE_CHARS = 20_000;
/** Most coordinates remembered per document. */
const MAX_FIELDS = 500;
/** The memo is dropped wholesale past this — cheaper than an LRU, and rare. */
const MAX_MEMO = 2_000;

export const ANONYMOUS_NAME = '(anonymous)';

const memo = new Map<string, OperationShape>();

const blankLiterals = {
  IntValue: (node: { value: string }) => ({ ...node, value: '0' }),
  FloatValue: (node: { value: string }) => ({ ...node, value: '0' }),
  StringValue: (node: { value: string }) => ({ ...node, value: '', block: false }),
  ListValue: (node: { values: unknown[] }) => ({ ...node, values: [] }),
  ObjectValue: (node: { fields: unknown[] }) => ({ ...node, fields: [] }),
};

const definitionName = (definition: DefinitionNode): string =>
  'name' in definition && definition.name ? definition.name.value : '';

function signatureOf(document: DocumentNode, operation: OperationDefinitionNode): string {
  const fragments = document.definitions.filter((d) => d.kind === Kind.FRAGMENT_DEFINITION);
  fragments.sort((a, b) => definitionName(a).localeCompare(definitionName(b)));
  const reduced: DocumentNode = { ...document, definitions: [operation, ...fragments] };
  const blanked = visit(reduced, blankLiterals as never) as DocumentNode;
  return stripIgnoredCharacters(print(blanked)).slice(0, MAX_SIGNATURE_CHARS);
}

function rootFieldsOf(operation: OperationDefinitionNode): string[] {
  return operation.selectionSet.selections
    .filter((selection) => selection.kind === Kind.FIELD)
    .map((selection) => (selection.kind === Kind.FIELD ? selection.name.value : ''))
    .filter((name) => name && !name.startsWith('__'));
}

function fieldsOf(document: DocumentNode, schema: GraphQLSchema | null): string[] {
  if (!schema) return [];
  const typeInfo = new TypeInfo(schema);
  const coordinates = new Set<string>();
  visit(
    document,
    visitWithTypeInfo(typeInfo, {
      Field() {
        const parent = typeInfo.getParentType();
        const field = typeInfo.getFieldDef();
        if (parent && field && !field.name.startsWith('__') && coordinates.size < MAX_FIELDS) {
          coordinates.add(`${parent.name}.${field.name}`);
        }
      },
    })
  );
  return [...coordinates];
}

export const opKeyOf = (signature: string): string =>
  createHash('sha1').update(signature).digest('hex').slice(0, 20);

/** The shape of a parsed, validated operation, memoised on its query hash. */
export function describeOperation(
  queryHash: string,
  document: DocumentNode,
  operation: OperationDefinitionNode,
  schema: GraphQLSchema | null
): OperationShape {
  const name = operation.name?.value ?? ANONYMOUS_NAME;
  const memoKey = `${queryHash}|${name}`;
  const known = memo.get(memoKey);
  if (known) return known;
  const signature = signatureOf(document, operation);
  const shape: OperationShape = {
    op_key: opKeyOf(signature),
    name,
    type: operation.operation.toUpperCase(),
    signature,
    root_fields: rootFieldsOf(operation),
    fields: fieldsOf(document, schema),
  };
  if (memo.size >= MAX_MEMO) memo.clear();
  memo.set(memoKey, shape);
  return shape;
}

/**
 * A request that never became an operation — it did not parse, did not
 * validate, or named an operation the document does not have. One row for all
 * of them: the errors page says what went wrong with each.
 */
export const INVALID_OPERATION: OperationShape = {
  op_key: 'invalid',
  name: '(invalid request)',
  type: 'UNKNOWN',
  signature: '',
  root_fields: [],
  fields: [],
};
