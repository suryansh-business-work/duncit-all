import { useEffect } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { gql, useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { hasImageLine } from '../../create-pod-page/create-pod/create-pod.form';
import MediaUrlsField from '../../create-pod-page/create-pod/fields/MediaUrlsField';
import { blankPodEditValues, type HostPodSummary, type PodEditValues } from './pod-edit.types';

export const HOST_UPDATE_POD = gql`
  mutation HostUpdatePod($pod_doc_id: ID!, $input: HostUpdatePodInput!) {
    hostUpdatePod(pod_doc_id: $pod_doc_id, input: $input) {
      id
      pod_title
      pod_description
      pod_images_and_videos {
        url
        type
      }
    }
  }
`;

export const podEditSchema = z.object({
  pod_title: z.string().trim().min(3, 'Title is too short').max(120, 'Title is too long'),
  pod_description: z.string().trim().min(10, 'Add a longer description'),
  media_text: z
    .string()
    .refine((text) => hasImageLine(text), 'Add at least one image URL'),
});

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

/** Maps the validated values onto the server's HostUpdatePodInput. */
export function buildHostUpdateInput(values: PodEditValues) {
  return {
    pod_title: values.pod_title.trim(),
    pod_description: values.pod_description.trim(),
    pod_images_and_videos: splitLines(values.media_text).map((url) => ({
      url,
      type: /\.(mp4|mov|webm)$/i.test(url) ? 'VIDEO' : 'IMAGE',
    })),
  };
}

/** Prefills the form from the pod being edited. */
export function podEditInitialValues(pod: HostPodSummary | null): PodEditValues {
  if (!pod) return blankPodEditValues;
  return {
    pod_title: pod.pod_title ?? '',
    pod_description: pod.pod_description ?? '',
    media_text: (pod.pod_images_and_videos ?? []).map((m) => m.url).join('\n'),
  };
}

interface PodEditFormProps {
  pod: HostPodSummary | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Host's limited pod edit dialog — only title, images and description (2A). */
export default function PodEditForm({ pod, onClose, onSaved }: Readonly<PodEditFormProps>) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PodEditValues>({
    resolver: zodResolver(podEditSchema),
    defaultValues: podEditInitialValues(pod),
  });
  const [save, saveState] = useMutation(HOST_UPDATE_POD);

  useEffect(() => {
    reset(podEditInitialValues(pod));
  }, [pod, reset]);

  const submit = handleSubmit(async (values) => {
    await save({
      variables: { pod_doc_id: pod?.id, input: buildHostUpdateInput(values) },
    });
    onSaved();
  });

  return (
    <Dialog open={!!pod} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 900 }}>Edit pod</DialogTitle>
      <DialogContent dividers>
        <Stack component="form" id="pod-edit-form" onSubmit={submit} spacing={2} sx={{ pt: 0.5 }}>
          <TextField
            label="Title"
            required
            fullWidth
            {...register('pod_title')}
            error={!!errors.pod_title}
            helperText={errors.pod_title?.message}
          />
          <TextField
            label="Description"
            required
            fullWidth
            multiline
            minRows={4}
            {...register('pod_description')}
            error={!!errors.pod_description}
            helperText={errors.pod_description?.message}
          />
          <Controller
            control={control}
            name="media_text"
            render={({ field, fieldState }) => (
              <MediaUrlsField
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
                label="Media"
              />
            )}
          />
          {saveState.error && <Alert severity="error">{saveState.error.message}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saveState.loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="pod-edit-form"
          variant="contained"
          disabled={saveState.loading}
          sx={{ borderRadius: 999, fontWeight: 900 }}
        >
          {saveState.loading ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
