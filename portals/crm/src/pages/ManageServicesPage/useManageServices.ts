import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  CREATE_CRM_SERVICE,
  CRM_LEAD_CONFIG,
  CRM_SERVICES,
  DELETE_CRM_SERVICE,
  UPDATE_CRM_SERVICE,
} from '../../api/crm.gql';
import type { CrmService, CrmServiceKind } from '../../api/crm.types';
import { parseApiError } from '@duncit/utils';
import { blankRow, type EditRow } from './types';

export function useManageServices(kind: CrmServiceKind) {
  const queryVars = { kind, include_inactive: true };
  const { data, loading, error } = useQuery<{ crmServices: CrmService[] }>(CRM_SERVICES, {
    variables: queryVars,
    fetchPolicy: 'cache-and-network',
  });
  // Mutations refetch both the catalogue list and `crmLeadConfig` so the
  // dropdown inside lead forms reflects changes immediately. The two
  // queries don't share normalised entities, so refetch-by-query is the
  // simplest correct path here.
  const refetchAfterMutate = [
    { query: CRM_SERVICES, variables: queryVars },
    { query: CRM_LEAD_CONFIG },
  ];
  const [createMut, createState] = useMutation<unknown>(CREATE_CRM_SERVICE, { refetchQueries: refetchAfterMutate });
  const [updateMut, updateState] = useMutation<unknown>(UPDATE_CRM_SERVICE, { refetchQueries: refetchAfterMutate });
  const [deleteMut, deleteState] = useMutation<unknown>(DELETE_CRM_SERVICE, { refetchQueries: refetchAfterMutate });

  const [draft, setDraft] = useState<EditRow | null>(null);
  const [removing, setRemoving] = useState<CrmService | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      (data?.crmServices ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [data]
  );

  const startCreate = () => {
    const nextSort = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;
    setDraft({ ...blankRow, sort_order: String(nextSort) });
    setFormError(null);
  };

  const startEdit = (row: CrmService) => {
    setDraft({
      id: row.id,
      name: row.name,
      sort_order: String(row.sort_order),
      is_active: row.is_active,
    });
    setFormError(null);
  };

  const cancelDraft = () => {
    setDraft(null);
    setFormError(null);
  };

  const saveDraft = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      setFormError('Service name is required');
      return;
    }
    const sort_order = Number.parseInt(draft.sort_order, 10);
    const input = {
      name,
      kind,
      sort_order: Number.isFinite(sort_order) ? sort_order : 0,
      is_active: draft.is_active,
    };
    try {
      if (draft.id) {
        await updateMut({ variables: { id: draft.id, input } });
      } else {
        await createMut({ variables: { input } });
      }
      setDraft(null);
      setFormError(null);
    } catch (e) {
      setFormError(parseApiError(e));
    }
  };

  const confirmDelete = async () => {
    if (!removing) return;
    try {
      await deleteMut({ variables: { id: removing.id } });
      setRemoving(null);
    } catch (e) {
      setFormError(parseApiError(e));
      setRemoving(null);
    }
  };

  const toggleActive = async (row: CrmService) => {
    try {
      await updateMut({
        variables: {
          id: row.id,
          input: { name: row.name, kind, sort_order: row.sort_order, is_active: !row.is_active },
        },
      });
    } catch (e) {
      setFormError(parseApiError(e));
    }
  };

  const busy = createState.loading || updateState.loading || deleteState.loading;

  return {
    loading,
    error,
    rows,
    draft,
    setDraft,
    removing,
    setRemoving,
    formError,
    setFormError,
    startCreate,
    startEdit,
    cancelDraft,
    saveDraft,
    confirmDelete,
    toggleActive,
    busy,
    deleting: deleteState.loading,
  };
}
