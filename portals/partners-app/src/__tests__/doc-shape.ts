/**
 * Fills a `gql` document's selection with an answer Apollo will write whole.
 *
 * Apollo drops a response that lacks any selected field, so a hand-written
 * fixture must name every field a query asks for — hundreds for the venue
 * reads. This walks the document itself: a field the test gives is kept (and
 * walked when it is an object or a list), every other selected field is null,
 * which is a legal value for a nullable field. Test kit, not shipped code.
 */
import type { DocumentNode, FieldNode, SelectionSetNode } from 'graphql';

type Plain = Record<string, unknown>;

const fieldsOf = (set: SelectionSetNode): FieldNode[] =>
  set.selections.filter((node): node is FieldNode => node.kind === 'Field' && node.name.value !== '__typename');

function fill(set: SelectionSetNode, given: unknown): unknown {
  if (Array.isArray(given)) return given.map((row) => fill(set, row));
  if (given === null || given === undefined) return null;
  const source = given as Plain;
  const out: Plain = {};
  for (const field of fieldsOf(set)) {
    const key = field.alias?.value ?? field.name.value;
    const value = source[key];
    out[key] = field.selectionSet ? fill(field.selectionSet, value) : (value ?? null);
  }
  return out;
}

/** The `data` object for the document's first operation, given only the fields a test cares about. */
export function shapeOf(doc: DocumentNode, given: Plain = {}): Plain {
  const operation = doc.definitions.find((node) => node.kind === 'OperationDefinition');
  if (operation?.kind !== 'OperationDefinition') throw new Error('document declares no operation');
  return fill(operation.selectionSet, given) as Plain;
}
