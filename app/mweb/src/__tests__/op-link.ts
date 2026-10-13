/**
 * An Apollo link that answers operations BY NAME and records what was sent.
 *
 * `MockedProvider` mocks match one exact variables object and are used up after
 * a single answer, which makes refetches, polling and "was this mutation sent
 * with that input" awkward. Tests that drive a flow (reply, resolve, reopen)
 * want the opposite: every operation answered the same way every time, and a
 * log to assert against. An operation with no handler fails loudly instead of
 * silently returning nothing.
 */
import { ApolloLink } from '@apollo/client';
import { Observable } from '@apollo/client/utilities';
import { GraphQLError } from 'graphql';

type Variables = Record<string, unknown>;
/** Return the `data` object, or throw — a thrown Error becomes a GraphQL error. */
export type OpHandler = (variables: Variables) => Record<string, unknown>;

export interface OpCall {
  name: string;
  variables: Variables;
}

export function opLink(handlers: Record<string, OpHandler>) {
  const calls: OpCall[] = [];
  const link = new ApolloLink(
    (operation) =>
      new Observable((observer) => {
        const { variables } = operation;
        const name = operation.operationName ?? '';
        calls.push({ name, variables });
        const handler = handlers[name];
        if (!handler) {
          observer.error(new Error(`opLink: no handler for ${name}`));
          return;
        }
        try {
          observer.next({ data: handler(variables) });
        } catch (e) {
          observer.next({ errors: [new GraphQLError(e instanceof Error ? e.message : String(e))] });
        }
        observer.complete();
      }),
  );
  /** Every call to one operation, oldest first. */
  const callsTo = (name: string) => calls.filter((c) => c.name === name);
  return { link, calls, callsTo };
}
