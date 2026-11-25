import { useCallback, useEffect, useRef, useState } from 'react';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { fireAndForget, logs } from '@duncit/logs';

import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';

export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Run a typed query and keep its result, loading flag and worded error. Runs
 * again whenever `variables` change (compared by value), and never sets state
 * after the screen has gone. `skip` holds it until its inputs are ready.
 */
export function useGqlQuery<TResult, TVars extends object>(
  document: TypedDocumentNode<TResult, TVars>,
  variables: TVars,
  options: { skip?: boolean; fallbackError?: string } = {},
): QueryState<TResult> {
  const [data, setData] = useState<TResult | null>(null);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const key = JSON.stringify(variables);
  const fallback = options.fallbackError ?? '';

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await gqlRequest(document, JSON.parse(key) as TVars);
      if (mounted.current) setData(result);
    } catch (err) {
      if (mounted.current) setError(errorMessage(err, fallback) || 'error');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [document, key, fallback]);

  useEffect(() => {
    mounted.current = true;
    if (!options.skip) fireAndForget(run(), logs.mobileApp, 'crm-app/useGqlQuery', 'run');
    return () => {
      mounted.current = false;
    };
  }, [run, options.skip]);

  return { data, loading, error, refetch: run };
}
