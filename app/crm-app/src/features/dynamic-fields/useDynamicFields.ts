import { useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import {
  dynamicFieldValuesFromRow,
  makeDynamicFieldSchema,
  moveDynamicFieldRow,
  toDynamicFieldInput,
} from '@duncit/forms/schemas';

import {
  CrmAppDeleteDynamicFieldDocument,
  CrmAppDynamicFieldsDocument,
  CrmAppReorderDynamicFieldsDocument,
  CrmAppUpdateDynamicFieldDocument,
} from '@/graphql/dynamicFields';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';

/** One saved field as the list reads it. */
export type DynamicFieldRecord = ResultOf<
  typeof CrmAppDynamicFieldsDocument
>['crmDynamicFields'][number];

/** Every field in the portal's order: by place, then by label. */
export const sortDynamicFields = <R extends { sort_order: number; label: string }>(
  rows: readonly R[],
): R[] =>
  rows.slice().sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));

/**
 * CRM › Settings › Dynamic Fields as the portal runs it: every field (inactive
 * ones too) in order, with switch on/off, move up/down and delete — each
 * change read back from the server, a refusal kept on screen.
 */
export function useDynamicFields() {
  const { t } = useTranslation();
  const list = useGqlQuery(
    CrmAppDynamicFieldsDocument,
    { include_inactive: true },
    { fallbackError: t('crmApp.common.loadFailed') },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rows = useMemo(() => sortDynamicFields(list.data?.crmDynamicFields ?? []), [list.data]);

  const change = async (run: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await run();
      await list.refetch();
      return true;
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
      return false;
    } finally {
      setBusy(false);
    }
  };

  /** A stored field the rules now refuse (e.g. a Select with no options) says why the switch did not move. */
  const toggle = async (row: DynamicFieldRecord) => {
    const values = { ...dynamicFieldValuesFromRow(row), is_active: !row.is_active };
    const checked = makeDynamicFieldSchema(t).safeParse(values);
    if (!checked.success) {
      setError(checked.error.issues[0]?.message ?? t('crmApp.common.saveFailed'));
      return;
    }
    const input = toDynamicFieldInput(values, row.sort_order);
    await change(() => gqlRequest(CrmAppUpdateDynamicFieldDocument, { id: row.id, input }));
  };

  const move = (from: number, to: number) =>
    change(() =>
      gqlRequest(CrmAppReorderDynamicFieldsDocument, {
        ids: moveDynamicFieldRow(rows, from, to).map((row) => row.id),
      }),
    );

  const remove = (row: DynamicFieldRecord) =>
    change(() => gqlRequest(CrmAppDeleteDynamicFieldDocument, { id: row.id }));

  return {
    rows,
    loading: list.loading,
    loadError: list.error,
    refetch: list.refetch,
    busy,
    error,
    toggle,
    move,
    remove,
  };
}
