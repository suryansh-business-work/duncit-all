import { useEffect } from 'react';
import { useFieldArray, useForm , type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import {
  buildPodContentSchema,
  type PodContentValues,
  type PodField,
  type ReadOnlyContextItem,
} from './types';

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
  title,
  defaultValues,
  editableFields,
  readOnlyContext = [],
  busy = false,
  error,
  onClose,
  onSubmit,
  onPickImage,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PodContentValues, any, PodContentValues>({
    resolver: zodResolver(buildPodContentSchema(t)) as unknown as Resolver<PodContentValues, any, PodContentValues>,
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'pod_images_and_videos' });

  useEffect(() => {
    if (open) reset(defaultValues);
  }, [open, defaultValues, reset]);

  const canEdit = (field: PodField) => editableFields.includes(field);
  const imagesDisabled = !canEdit('pod_images_and_videos');

  // Built only when the caller can pick — the button below renders off the same
  // value, so the handler never has to re-check that it exists.
  const addImage = onPickImage
    ? async () => {
        const url = await onPickImage();
        if (url) append({ url, type: 'IMAGE' });
      }
    : undefined;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title ?? t('shell.podContent.title')}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers>
          <Stack spacing={2}>
            {readOnlyContext.length > 0 && (
              <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                <Typography
                  variant="overline"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 800
                  }}>
                  {t('shell.podContent.readOnlyHeading')}
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
              label={t('shell.podContent.name')}
              fullWidth
              required={canEdit('pod_title')}
              disabled={!canEdit('pod_title')}
              error={!!errors.pod_title}
              helperText={errors.pod_title?.message}
              {...register('pod_title')}
            />
            <TextField
              label={t('shell.podContent.description')}
              fullWidth
              multiline
              minRows={3}
              required={canEdit('pod_description')}
              disabled={!canEdit('pod_description')}
              error={!!errors.pod_description}
              helperText={errors.pod_description?.message}
              {...register('pod_description')}
            />

            <Box>
              <Stack
                direction="row"
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 0.5
                }}>
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  {t('shell.podContent.images')}
                </Typography>
                {!imagesDisabled && addImage && (
                  <DuncitButton size="small" startIcon={<AddPhotoAlternateIcon />} onClick={addImage}>
                    {t('shell.podContent.addImage')}
                  </DuncitButton>
                )}
              </Stack>
              {fields.length > 0 ? (
                <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))' }}>
                  {fields.map((field, index) => (
                    <Box key={field.id} sx={{ position: 'relative', aspectRatio: '1 / 1' }}>
                      <Box
                        component="img"
                        src={field.url}
                        alt={t('shell.podContent.mediaAlt')}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1 }}
                      />
                      {!imagesDisabled && (
                        <DuncitIconButton
                          size="small"
                          onClick={() => remove(index)}
                          sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </DuncitIconButton>
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>
                  {t('shell.podContent.noImages')}
                </Typography>
              )}
            </Box>

            {/* `whiteSpace: pre-line` keeps a content refusal readable: it
                arrives as a headline followed by one line per rule broken. */}
            {error && (
              <Alert severity="error" sx={{ whiteSpace: 'pre-line' }}>
                {error}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onClose}>{t('shell.common.cancel')}</DuncitButton>
          <DuncitButton type="submit" variant="contained" disabled={busy}>
            {busy ? t('shell.common.saving') : t('shell.common.save')}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
