import { useApolloClient, useMutation } from '@apollo/client';
import { usePodEditorState, type PodFormConfig } from '@duncit/pod-form';
import { useConfirm, notifyError } from '@duncit/dialogs';
import { CREATE, UPDATE, DELETE, POD_FOR_EDIT, type PodRow } from './queries';

interface Args {
  config: PodFormConfig;
  clubFilter: string;
  /** /pods?edit=<id> deep-link target (rows are paged, so the pod is fetched directly). */
  editId: string;
  onChanged: (message: string) => void;
}

/** Admin wiring for the shared pod editor: Apollo mutations, deep-link + delete. */
export default function usePodEditor({ config, clubFilter, editId, onChanged }: Args) {
  const client = useApolloClient();
  const [createMut] = useMutation(CREATE);
  const [updateMut] = useMutation(UPDATE);
  const [deleteMut] = useMutation(DELETE);
  const confirm = useConfirm();

  const editor = usePodEditorState({
    config,
    createDefaults: { club_id: clubFilter || '' },
    submitCreate: (input) => createMut({ variables: { input } }),
    submitUpdate: (id, input) => updateMut({ variables: { id, input } }),
    onSaved: ({ draft }) => onChanged(draft ? 'Draft saved' : 'Saved'),
    editId,
    resolveEditPod: (id) =>
      client
        .query({ query: POD_FOR_EDIT, variables: { id }, fetchPolicy: 'network-only' })
        .then(({ data }) => data?.pod ?? null)
        .catch((e: Error) => {
          notifyError(e.message);
          return null;
        }),
  });

  const remove = async (p: PodRow) => {
    const ok = await confirm({
      title: 'Delete pod',
      message: `Delete pod "${p.pod_title}"?`,
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteMut({ variables: { id: p.id } });
      onChanged('Deleted');
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  return { ...editor, remove };
}
