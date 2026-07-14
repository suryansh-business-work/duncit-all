import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { PodContentFormDialog, type PodContentValues } from '@duncit/portal-pod-form';
import { UPDATE } from './queries';

interface Props {
  pod: any | null;
  clubName: (id: string) => string;
  venueName: (id: string) => string;
  onClose: () => void;
  onSaved: () => void;
  onPickImage: () => Promise<string | null>;
}

/** Quick edit (name, description, images) for a pod row — owns its own mutation state. */
export default function QuickEditPodDialog({
  pod,
  clubName,
  venueName,
  onClose,
  onSaved,
  onPickImage,
}: Readonly<Props>) {
  const [updateMut] = useMutation(UPDATE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!pod) return null;

  const save = async (values: PodContentValues) => {
    setBusy(true);
    setError(null);
    try {
      await updateMut({
        variables: {
          id: pod.id,
          input: {
            pod_title: values.pod_title,
            pod_description: values.pod_description,
            pod_images_and_videos: values.pod_images_and_videos.map((m) => ({ url: m.url, type: m.type || 'IMAGE' })),
          },
        },
      });
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PodContentFormDialog
      open={!!pod}
      title="Quick edit pod"
      defaultValues={{
        pod_title: pod.pod_title || '',
        pod_description: pod.pod_description || '',
        pod_images_and_videos: (pod.pod_images_and_videos ?? []).map((m: any) => ({ url: m.url, type: m.type })),
      }}
      editableFields={['pod_title', 'pod_description', 'pod_images_and_videos']}
      readOnlyContext={[
        { label: 'Club', value: clubName(pod.club_id) },
        { label: 'Place', value: pod.pod_mode === 'VIRTUAL' ? 'Virtual pod' : venueName(pod.venue_id) },
      ]}
      busy={busy}
      error={error}
      onClose={onClose}
      onSubmit={save}
      onPickImage={onPickImage}
    />
  );
}
