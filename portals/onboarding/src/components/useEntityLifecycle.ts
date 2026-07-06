import { useState } from 'react';
import { useMutation } from '@apollo/client';
import type { DocumentNode } from 'graphql';
import { useUserData } from '@duncit/user-context';
import { parseApiError } from '../utils/parseApiError';

/** Shared deactivate/activate + developer hard-delete wiring for the onboarded
 * Venues / Hosts / Brands tables. Row objects are the pages' loosely-typed
 * records, so targets are `any`. The setActive + delete mutations must both use
 * the `$id`, `$active`, `$email`, `$password` variables (see each queries.ts). */
export function useEntityLifecycle(
  setActiveMutation: DocumentNode,
  deleteMutation: DocumentNode,
  onDone: () => void
) {
  const { user } = useUserData();
  const roles = user?.roles ?? [];
  const canHardDelete = roles.includes('DEVELOPERS_MANAGER') || roles.includes('SUPER_ADMIN');

  const [setActive, { loading: toggling }] = useMutation(setActiveMutation);
  const [runDelete, { loading: deleting }] = useMutation(deleteMutation);

  const [toggleTarget, setToggleTarget] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmToggle = async () => {
    if (!toggleTarget) return;
    await setActive({ variables: { id: toggleTarget.id, active: !toggleTarget.is_active } });
    setToggleTarget(null);
    onDone();
  };

  const closeDelete = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const confirmDelete = async (email: string, password: string) => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await runDelete({ variables: { id: deleteTarget.id, email, password } });
      closeDelete();
      onDone();
    } catch (err) {
      setDeleteError(parseApiError(err));
    }
  };

  return {
    canHardDelete,
    toggling,
    deleting,
    toggleTarget,
    setToggleTarget,
    confirmToggle,
    deleteTarget,
    setDeleteTarget,
    deleteError,
    closeDelete,
    confirmDelete,
  };
}
