import { createContext, useCallback, useContext } from 'react';
import { useMutation } from '@apollo/client/react';
import type { DocumentNode, OperationVariables, TypedDocumentNode } from '@apollo/client';

/**
 * Fired once a test call settles. Every test stamps `last_tested_at` /
 * `last_test_ok` on the entry server-side, but the mutations answer with the
 * test result, not the row — so the table behind the drawer has to be told to
 * read it again, or it keeps showing the previous result until a reload.
 */
export const EnvTestedContext = createContext<() => void>(() => undefined);

/** `useMutation` for a test panel: same tuple, plus the table refresh after it settles. */
export function useEnvTestMutation<TData, TVariables extends OperationVariables = OperationVariables>(
  doc: DocumentNode | TypedDocumentNode<TData, TVariables>,
) {
  const onTested = useContext(EnvTestedContext);
  const [mutate, state] = useMutation<TData, TVariables>(doc);
  const run = useCallback(
    (...args: Parameters<typeof mutate>) => mutate(...args).finally(onTested),
    [mutate, onTested],
  );
  return [run, state] as const;
}
