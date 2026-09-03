import { useMemo } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import usePodEditorState, { type PodEditorSaveMeta } from '../editor/usePodEditorState';
import type { PodHostOption } from '../types';
import { CLUB_ADMIN_POD_CONFIG } from './config';
import { CLUB_ADMIN_CREATE_POD, CLUB_ADMIN_HOST_SEARCH, CLUB_ADMIN_UPDATE_POD } from './queries';

export interface UseClubAdminPodEditorArgs {
  clubId: string;
  /** The pod being edited; null on the create route. */
  editingPod?: any;
  onSaved: (meta: PodEditorSaveMeta) => void;
}

/**
 * Club-admin wiring for the shared pod editor: pinned club, host search + seed.
 *
 * The Partners console and mWeb both mount `PodEditorPage` over this one hook,
 * so a club admin writes a pod the same way on either surface (rule 40).
 */
export default function useClubAdminPodEditor({
  clubId,
  editingPod,
  onSaved,
}: UseClubAdminPodEditorArgs) {
  const client = useApolloClient();
  const [createPod] = useMutation<any>(CLUB_ADMIN_CREATE_POD);
  const [updatePod] = useMutation<any>(CLUB_ADMIN_UPDATE_POD);

  const editor = usePodEditorState({
    config: CLUB_ADMIN_POD_CONFIG,
    editingPod,
    createDefaults: { club_id: clubId },
    // Every save stays pinned to this club server-side.
    submitCreate: (input) => createPod({ variables: { input: { ...input, club_id: clubId } } }),
    submitUpdate: (podDocId, input) =>
      updatePod({ variables: { pod_doc_id: podDocId, input: { ...input, club_id: clubId } } }),
    onSaved,
  });

  const searchHosts = (term: string): Promise<PodHostOption[]> =>
    client
      .query<any>({
        query: CLUB_ADMIN_HOST_SEARCH,
        variables: { search: term || undefined },
        fetchPolicy: 'network-only',
      })
      .then(({ data }) => data?.clubAdminHostSearch ?? []);

  // Labelled seed for the pod's preselected hosts (host_names is id-ordered).
  const hostSeed: PodHostOption[] = useMemo(
    () =>
      (editingPod?.pod_hosts_id ?? []).map((id: string, index: number) => ({
        user_id: id,
        full_name: editingPod?.host_names?.[index] ?? id,
      })),
    [editingPod],
  );

  return { ...editor, searchHosts, hostSeed };
}
