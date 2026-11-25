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
import { crmFilterManagedOptions, crmNextManagedOrder, crmSortManagedOptions, parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import type { ManagedEditRow } from '../ManagedOptionEditRow';

const blank: ManagedEditRow = { name: '', sort_order: '0', is_active: true };

/** Query, mutations and draft state behind one managed-option group's list. */
export function useManagedOptions(group: CrmManagedOptionGroup) {
  const { t } = useTranslation();
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

  // Order, search and the next place are shared with the Duncit CRM app (@duncit/utils).
  const rows = useMemo(() => crmSortManagedOptions(data?.crmManagedOptions ?? []), [data]);
  const visible = useMemo(() => crmFilterManagedOptions(rows, search), [rows, search]);
  const busy = createState.loading || updateState.loading || deleteState.loading;

  const startCreate = () => {
    setDraft({ ...blank, sort_order: String(crmNextManagedOrder(rows)) });
    setFormError(null);
  };

  const persist = async (current: ManagedEditRow) => {
    const name = current.name.trim();
    if (!name) return setFormError(t('crm.data.optionNameRequired'));
    const parsed = Number.parseInt(current.sort_order, 10);
    const sort_order = Number.isFinite(parsed) ? parsed : 0;
    try {
      if (current.id) {
        await updateMut({ variables: { id: current.id, input: { name, sort_order, is_active: current.is_active } } });
      } else {
        await createMut({ variables: { input: { name, group, sort_order, is_active: current.is_active } } });
      }
      setDraft(null);
      setFormError(null);
    } catch (e) {
      setFormError(parseApiError(e));
    }
  };

  // The inline row that calls this exists only while a draft is open.
  const save = async () => {
    if (draft) await persist(draft);
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
