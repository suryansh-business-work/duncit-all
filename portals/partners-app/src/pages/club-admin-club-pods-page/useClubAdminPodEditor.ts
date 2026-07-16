import { useMemo } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import {
  makeNativeParityPodConfig,
  usePodEditorState,
  type PodEditorSaveMeta,
  type PodHostOption,
} from '@duncit/pod-form';
import { CLUB_ADMIN_CREATE_POD, CLUB_ADMIN_HOST_SEARCH, CLUB_ADMIN_UPDATE_POD } from './queries';

/** Native-parity pod form for Club Admins: venue slots, place charges, reel and
 * an optional assign-host picker (the server injects the admin when empty). */
export const CLUB_ADMIN_POD_CONFIG = makeNativeParityPodConfig({ showProducts: true });

interface Args {
  clubId: string;
  onSaved: (meta: PodEditorSaveMeta) => void;
}

/** Club-admin wiring for the shared pod editor: pinned club, host search + seed. */
export default function useClubAdminPodEditor({ clubId, onSaved }: Args) {
  const client = useApolloClient();
  const [createPod] = useMutation(CLUB_ADMIN_CREATE_POD);
  const [updatePod] = useMutation(CLUB_ADMIN_UPDATE_POD);

  const editor = usePodEditorState({
    config: CLUB_ADMIN_POD_CONFIG,
    createDefaults: { club_id: clubId },
    // Every save stays pinned to this club server-side.
    submitCreate: (input) => createPod({ variables: { input: { ...input, club_id: clubId } } }),
    submitUpdate: (podDocId, input) =>
      updatePod({ variables: { pod_doc_id: podDocId, input: { ...input, club_id: clubId } } }),
    onSaved,
  });

  const searchHosts = (term: string): Promise<PodHostOption[]> =>
    client
      .query({
        query: CLUB_ADMIN_HOST_SEARCH,
        variables: { search: term || undefined },
        fetchPolicy: 'network-only',
      })
      .then(({ data }) => data?.clubAdminHostSearch ?? []);

  // Labelled seed for the pod's preselected hosts (host_names is id-ordered).
  const editingPod = editor.editingPod;
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
