import { useMutation } from '@apollo/client/react';
import { useConfirm, notifyError } from '@duncit/dialogs';
import { DELETE, type PodRow } from './queries';

interface Args {
  onChanged: (message: string) => void;
}

/** Admin pod deletion: confirm, mutate, tell the list to reload. */
export default function usePodDelete({ onChanged }: Args) {
  const [deleteMut] = useMutation<any>(DELETE);
  const confirm = useConfirm();

  return async (p: PodRow) => {
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
}
