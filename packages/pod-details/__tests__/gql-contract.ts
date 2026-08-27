/**
 * Test-only readers for a `gql` document's AST.
 *
 * A `queries.ts` module is almost entirely GraphQL documents, so the thing worth
 * testing is the contract each screen leans on: the operation name (what
 * `refetchQueries` names), the declared variables and their types, and the fields
 * a component reads off the response. Asserting on the AST — rather than on the
 * printed string — is what catches a renamed field or a variable that silently
 * became nullable.
 */
import {
  print,
  type DocumentNode,
  type FieldNode,
  type FragmentDefinitionNode,
  type OperationDefinitionNode,
  type SelectionSetNode,
} from 'graphql';

const operationDefinition = (doc: DocumentNode): OperationDefinitionNode => {
  const definition = doc.definitions.find(
    (node): node is OperationDefinitionNode => node.kind === 'OperationDefinition',
  );
  if (!definition) {
    throw new Error('document declares no operation');
  }
  return definition;
};

/** `{ name: 'AdminUser', type: 'query' }` — the name refetchQueries has to match. */
export const operationOf = (doc: DocumentNode): { name: string; type: string } => {
  const definition = operationDefinition(doc);
  return { name: definition.name?.value ?? '', type: definition.operation };
};

/** `{ user_id: 'ID!' }` — declared variables mapped to their printed GraphQL type. */
export const variablesOf = (doc: DocumentNode): Record<string, string> =>
  Object.fromEntries(
    (operationDefinition(doc).variableDefinitions ?? []).map((definition) => [
      definition.variable.name.value,
      print(definition.type),
    ]),
  );

const fragmentsOf = (doc: DocumentNode): Map<string, FragmentDefinitionNode> =>
  new Map(
    doc.definitions
      .filter((node): node is FragmentDefinitionNode => node.kind === 'FragmentDefinition')
      .map((fragment) => [fragment.name.value, fragment]),
  );

/** Inlines fragment spreads so a `...RowFields` selection reads like a literal one. */
const flattenFields = (
  set: SelectionSetNode,
  fragments: Map<string, FragmentDefinitionNode>,
): FieldNode[] => {
  const fields: FieldNode[] = [];
  for (const selection of set.selections) {
    if (selection.kind === 'Field') {
      fields.push(selection);
    } else if (selection.kind === 'FragmentSpread') {
      const fragment = fragments.get(selection.name.value);
      if (!fragment) {
        throw new Error(`document spreads unknown fragment "${selection.name.value}"`);
      }
      fields.push(...flattenFields(fragment.selectionSet, fragments));
    } else {
      fields.push(...flattenFields(selection.selectionSet, fragments));
    }
  }
  return fields;
};

const nameOf = (field: FieldNode): string => field.alias?.value ?? field.name.value;

/** The field reached by walking `path` down from the operation root. */
export const fieldAt = (doc: DocumentNode, path: readonly string[]): FieldNode => {
  const fragments = fragmentsOf(doc);
  let set = operationDefinition(doc).selectionSet;
  let current: FieldNode | null = null;
  for (const step of path) {
    const next = flattenFields(set, fragments).find((field) => nameOf(field) === step);
    if (!next) {
      throw new Error(`"${step}" is not selected under "${path.join('.')}"`);
    }
    current = next;
    if (next.selectionSet) {
      set = next.selectionSet;
    }
  }
  if (!current) {
    throw new Error('fieldAt needs at least one path step');
  }
  return current;
};

/** Field names selected at `path`; with no path, the operation's root fields. */
export const fieldsAt = (doc: DocumentNode, ...path: string[]): string[] => {
  const root = operationDefinition(doc).selectionSet;
  const set = path.length === 0 ? root : fieldAt(doc, path).selectionSet;
  if (!set) {
    throw new Error(`"${path.join('.')}" selects no sub-fields`);
  }
  return flattenFields(set, fragmentsOf(doc)).map(nameOf);
};

/** `{ user_id: '$user_id' }` — the arguments the field at `path` passes through. */
export const argumentsAt = (doc: DocumentNode, ...path: string[]): Record<string, string> =>
  Object.fromEntries(
    (fieldAt(doc, path).arguments ?? []).map((argument) => [argument.name.value, print(argument.value)]),
  );
