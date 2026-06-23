import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import { podContentSchema, type PodContentValues, type PodField, type ReadOnlyContextItem } from './types';

interface Props {
  open: boolean;
  title?: string;
  defaultValues: PodContentValues;
  /** Which fields are editable. Any field not listed renders read-only. */
  editableFields: PodField[];
  /** Read-only pod context (date, place, amount…) shown above the editable fields. */
  readOnlyContext?: ReadOnlyContextItem[];
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: PodContentValues) => void | Promise<void>;
  /** Opens the host app's media picker and resolves with the chosen URL. */
  onPickImage?: () => Promise<string | null>;
}

// Shared, config-driven pod content editor (RHF + Zod). Admin and the partner
// portal both render it; `editableFields` decides what each can change.
export default function PodContentFormDialog({
  open,
  title = 'Edit pod',
  defaultValues,
  editableFields,
  readOnlyContext = [],
  busy = false,
  error,
  onClose,
  onSubmit,
  onPickImage,
}: Readonly<Props>) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PodContentValues>({ resolver: zodResolver(podContentSchema), defaultValues });
  const { fields, append, remove } = useFieldArray({ control, name: 'pod_images_and_videos' });

  useEffect(() => {
    if (open) reset(defaultValues);
  }, [open, defaultValues, reset]);

  const canEdit = (field: PodField) => editableFields.includes(field);
  const imagesDisabled = !canEdit('pod_images_and_videos');

  const addImage = async () => {
    if (!onPickImage) return;
    const url = await onPickImage();
    if (url) append({ url, type: 'IMAGE' });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers>
          <Stack spacing={2}>
            {readOnlyContext.length > 0 && (
              <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                <Typography variant="overline" color="text.secondary" fontWeight={800}>
                  Pod details (read-only)
                </Typography>
                <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                  {readOnlyContext.map((item) => (
                    <Typography key={item.label} variant="body2">
                      <Box component="span" sx={{ color: 'text.secondary' }}>
                        {item.label}:{' '}
                      </Box>
                      {item.value}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}

            <TextField
              label="Name"
              fullWidth
              disabled={!canEdit('pod_title')}
              error={!!errors.pod_title}
              helperText={errors.pod_title?.message}
              {...register('pod_title')}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              disabled={!canEdit('pod_description')}
              error={!!errors.pod_description}
              helperText={errors.pod_description?.message}
              {...register('pod_description')}
            />

            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Images
                </Typography>
                {!imagesDisabled && onPickImage && (
                  <Button size="small" startIcon={<AddPhotoAlternateIcon />} onClick={addImage}>
                    Add image
                  </Button>
                )}
              </Stack>
              {fields.length > 0 ? (
                <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))' }}>
                  {fields.map((field, index) => (
                    <Box key={field.id} sx={{ position: 'relative', aspectRatio: '1 / 1' }}>
                      <Box
                        component="img"
                        src={field.url}
                        alt="Pod media"
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1 }}
                      />
                      {!imagesDisabled && (
                        <IconButton
                          size="small"
                          onClick={() => remove(index)}
                          sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  No images yet.
                </Typography>
              )}
            </Box>

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
