/**
 * An Apollo link that answers each operation BY NAME, whatever its variables.
 *
 * The table-backed pages send a `TableQueryInput` their grid builds itself
 * (page, sort, search, filters), so a MockedProvider mock keyed on exact
 * variables would have to re-derive the grid's own state to ever match. These
 * suites care about what a page does with the answer, not how the grid spells
 * its request, so the answer is looked up by operation name and every sent
 * operation is recorded for the tests that do assert on variables.
 */
import { ApolloLink } from '@apollo/client';
import { Observable } from '@apollo/client/utilities';

export type ScriptedResult = Record<string, unknown> | Error;

/** An answer, or one computed from the variables the operation carried. */
export type ScriptedAnswer = ScriptedResult | ((variables: Record<string, unknown>) => ScriptedResult);

export interface SentOperation {
  name: string;
  variables: Record<string, unknown>;
}

/** Answer that never arrives — the page stays in its loading state. */
export const STAY_PENDING = new Error('stay-pending');

export function scriptedLink(
  answers: Readonly<Record<string, ScriptedAnswer>>,
  sent: SentOperation[] = [],
): ApolloLink {
  return new ApolloLink((operation) => {
    // Every document these suites send is a named operation.
    const name = operation.operationName ?? '';
    sent.push({ name, variables: operation.variables });
    return new Observable((observer) => {
      const script = answers[name];
      const answer = typeof script === 'function' ? script(operation.variables) : script;
      if (answer === STAY_PENDING) return;
      Promise.resolve().then(() => {
        if (answer === undefined) {
          observer.error(new Error(`No scripted answer for ${name}`));
          return;
        }
        if (answer instanceof Error) {
          observer.next({ errors: [{ message: answer.message }] });
        } else {
          observer.next({ data: answer });
        }
        observer.complete();
      });
    });
  });
}
