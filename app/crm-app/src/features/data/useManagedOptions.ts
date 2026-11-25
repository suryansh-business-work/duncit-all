import { useMemo, useState } from 'react';
import { crmFilterManagedOptions, crmNextManagedOrder, crmSortManagedOptions } from '@duncit/utils';
import { toManagedOptionInput, type ManagedOptionValues } from '@duncit/forms/schemas';

import {
  CrmAppCreateManagedOptionDocument,
  CrmAppDeleteManagedOptionDocument,
  CrmAppManagedOptionsDocument,
  CrmAppUpdateManagedOptionDocument,
} from '@/graphql/managedOptions';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';

export type ManagedOptionGroup = 'AMENITY' | 'EVENT_SUITABILITY';

export interface ManagedOption {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

/** The portal's own words for each list (literal keys, so the localization gate sees them). */
export const MANAGED_GROUP_COPY: Record<
  ManagedOptionGroup,
  { title: string; intro: string; add: string; search: string; placeholder: string }
> = {
  AMENITY: {
    title: 'shell.nav.amenitiesManagement',
    intro: 'crm.data.amenitiesIntro',
    add: 'crm.data.addAmenity',
    search: 'crm.data.searchAmenities',
    placeholder: 'crm.data.eGPowerBackup',
  },
  EVENT_SUITABILITY: {
    title: 'shell.nav.eventSuitabilityManagement',
    intro: 'crm.data.eventSuitabilityIntro',
    add: 'crm.data.addEventType',
    search: 'crm.data.searchEventTypes',
    placeholder: 'crm.data.eGCorporateMeetup',
  },
};

/** What is being edited: a new entry, an existing one, or nothing. */
export type Draft = { id: string | null; values: ManagedOptionValues } | null;

/**
 * One managed list as the portal runs it: every entry (inactive ones too) in
 * order, searchable, with add, edit, switch on/off and delete — each change
 * read back from the server.
 */
export function useManagedOptions(group: ManagedOptionGroup, fallbackError: string) {
  const list = useGqlQuery(
    CrmAppManagedOptionsDocument,
    { group, include_inactive: true },
    { fallbackError },
  );
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Draft>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows: ManagedOption[] = useMemo(
    () => crmSortManagedOptions(list.data?.crmManagedOptions ?? []),
    [list.data],
  );
  const visible = useMemo(() => crmFilterManagedOptions(rows, search), [rows, search]);

  /** Run a change, then read the list again; a failure stays on screen. */
  const change = async (run: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await run();
      await list.refetch();
      return true;
    } catch (err) {
      setError(errorMessage(err, fallbackError));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const startCreate = () =>
    setDraft({
      id: null,
      values: { name: '', sort_order: crmNextManagedOrder(rows), is_active: true },
    });
  const startEdit = (row: ManagedOption) =>
    setDraft({
      id: row.id,
      values: { name: row.name, sort_order: row.sort_order, is_active: row.is_active },
    });

  const save = async (values: ManagedOptionValues) => {
    const id = draft?.id;
    const input = toManagedOptionInput(values);
    const saved = await change(() =>
      id
        ? gqlRequest(CrmAppUpdateManagedOptionDocument, { id, input })
        : gqlRequest(CrmAppCreateManagedOptionDocument, { input: { ...input, group } }),
    );
    if (saved) setDraft(null);
  };

  const toggle = (row: ManagedOption) =>
    change(() =>
      gqlRequest(CrmAppUpdateManagedOptionDocument, {
        id: row.id,
        input: { is_active: !row.is_active },
      }),
    );
  const remove = (row: ManagedOption) =>
    change(() => gqlRequest(CrmAppDeleteManagedOptionDocument, { id: row.id }));

  return {
    loading: list.loading,
    /** The list could not be read. */
    loadError: list.error,
    refetch: list.refetch,
    rows,
    visible,
    search,
    setSearch,
    draft,
    setDraft,
    busy,
    /** A change (add, edit, switch, delete) failed. */
    error,
    setError,
    startCreate,
    startEdit,
    save,
    toggle,
    remove,
  };
}
