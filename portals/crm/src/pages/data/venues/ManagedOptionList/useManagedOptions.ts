import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  CRM_MANAGED_OPTIONS,
  CREATE_CRM_MANAGED_OPTION,
  DELETE_CRM_MANAGED_OPTION,
  UPDATE_CRM_MANAGED_OPTION,
  type CrmManagedOption,
  type CrmManagedOptionGroup,
} from '../../../../api/data.gql';
import { CRM_LEAD_CONFIG } from '../../../../api/crm.gql';
import { parseApiError } from '@duncit/utils';
import type { ManagedEditRow } from '../ManagedOptionEditRow';

const blank: ManagedEditRow = { name: '', sort_order: '0', is_active: true };

/** Query, mutations and draft state behind one managed-option group's list. */
export function useManagedOptions(group: CrmManagedOptionGroup) {
  const queryVars = { group, include_inactive: true };
  const { data, loading, error } = useQuery<{ crmManagedOptions: CrmManagedOption[] }>(CRM_MANAGED_OPTIONS, {
    variables: queryVars,
    fetchPolicy: 'cache-and-network',
  });
  const refetchQueries = [{ query: CRM_MANAGED_OPTIONS, variables: queryVars }, { query: CRM_LEAD_CONFIG }];
  const [createMut, createState] = useMutation<unknown>(CREATE_CRM_MANAGED_OPTION, { refetchQueries });
  const [updateMut, updateState] = useMutation<unknown>(UPDATE_CRM_MANAGED_OPTION, { refetchQueries });
  const [deleteMut, deleteState] = useMutation<unknown>(DELETE_CRM_MANAGED_OPTION, { refetchQueries });

  const [draft, setDraft] = useState<ManagedEditRow | null>(null);
  const [removing, setRemoving] = useState<CrmManagedOption | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const rows = useMemo(
    () => (data?.crmManagedOptions ?? []).slice().sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [data]
  );
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
  }, [rows, search]);
  const busy = createState.loading || updateState.loading || deleteState.loading;

  const startCreate = () => {
    const next = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;
    setDraft({ ...blank, sort_order: String(next) });
    setFormError(null);
  };

  const save = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) return setFormError('Name is required.');
    const parsed = Number.parseInt(draft.sort_order, 10);
    const sort_order = Number.isFinite(parsed) ? parsed : 0;
    try {
      if (draft.id) {
        await updateMut({ variables: { id: draft.id, input: { name, sort_order, is_active: draft.is_active } } });
      } else {
        await createMut({ variables: { input: { name, group, sort_order, is_active: draft.is_active } } });
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
    } catch (e) {
      setFormError(parseApiError(e));
    }
    setRemoving(null);
  };

  return {
    loading,
    error,
    updateMut,
    deleting: deleteState.loading,
    draft,
    setDraft,
    removing,
    setRemoving,
    formError,
    setFormError,
    search,
    setSearch,
    rows,
    visible,
    busy,
    startCreate,
    save,
    confirmDelete,
  };
}
