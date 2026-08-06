import { describe, expect, it } from 'vitest';
import type { DocumentNode, FieldNode, OperationDefinitionNode, SelectionNode } from 'graphql';
import {
  FRAGMENT_OPTIONS,
  TEMPLATES,
} from '../../src/pages/email-templates-page/queries';
import { FRAGMENTS } from '../../src/pages/email-fragments-page/queries';
import { EMAIL_LOG_ONE } from '../../src/pages/email-logs-page/queries';

/**
 * The tech portal has no GraphQL codegen, so `useQuery<{ x: Shape[] }>` is an
 * unchecked ASSERTION — TypeScript believes whatever the call site claims, and
 * the query underneath can select something else entirely.
 *
 * That is not hypothetical. Renaming a fragment's identity from `category` to
 * `key` updated the `FragmentOption` interface sitting three lines below the
 * query and left the selection set alone. Every option then arrived with
 * `key: undefined`, so `<MenuItem value={undefined}>` handed MUI an undefined
 * value, the picker wrote `null` for every choice, the dirty check saw no
 * change and the Save button never enabled — the user clicked a fragment and
 * nothing happened, with no error anywhere.
 *
 * The component test could not catch it: it hand-builds its options WITH a
 * `key`, so it was green against data production never produces. This asserts
 * the QUERY, which is the thing that was wrong.
 */

/** The field names one operation actually asks the server for, by path. */
function fieldsUnder(doc: DocumentNode, rootField: string): string[] {
  const op = doc.definitions.find(
    (d): d is OperationDefinitionNode => d.kind === 'OperationDefinition'
  );
  const isField = (s: SelectionNode): s is FieldNode => s.kind === 'Field';
  const root = op?.selectionSet.selections.filter(isField).find((f) => f.name.value === rootField);
  return (root?.selectionSet?.selections ?? []).filter(isField).map((f) => f.name.value);
}

describe('email query selection sets match what the code reads', () => {
  it('the fragment picker asks for the identity it renders — `key`, not `category`', () => {
    const fields = fieldsUnder(FRAGMENT_OPTIONS, 'emailFragments');
    // `key` is what FragmentOption declares and what <MenuItem value=…> renders.
    expect(fields).toContain('key');
    expect(fields).toContain('name');
    expect(fields).toContain('is_active');
  });

  it('the templates list asks for every field the editor saves back', () => {
    const fields = fieldsUnder(TEMPLATES, 'emailTemplates');
    // A field the editor writes but never reads back is a field that silently
    // reverts on the next refetch.
    for (const required of [
      'template_id',
      'slug',
      'name',
      'subject',
      'mjml',
      'fragment_key',
      'footer_note',
      'is_active',
    ]) {
      expect(fields).toContain(required);
    }
  });

  it('the log drawer asks for the body, the variables and the way back to the template', () => {
    const fields = fieldsUnder(EMAIL_LOG_ONE, 'emailLog');
    // `html` and `vars` are the whole reason this query exists beside the
    // table's; `template` and `fragment_key` are what its links navigate by.
    for (const required of ['html', 'vars', 'template', 'fragment_key']) {
      expect(fields).toContain(required);
    }
  });

  it('the fragments page asks for the identity it selects rows by', () => {
    const fields = fieldsUnder(FRAGMENTS, 'emailFragments');
    for (const required of ['key', 'is_system', 'header_mjml', 'footer_mjml', 'is_active']) {
      expect(fields).toContain(required);
    }
  });
});
