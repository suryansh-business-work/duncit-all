import { Box, Stack, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import type { FieldArrayWithId } from 'react-hook-form';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import type { PodContentValues } from '../types';

interface Props {
  fields: FieldArrayWithId<PodContentValues, 'pod_images_and_videos', 'id'>[];
  /** The caller cannot change the pod's images — no Add, no delete. */
  disabled: boolean;
  /** Absent when the host app offers no media picker. */
  onAdd?: () => void;
  onRemove: (index: number) => void;
}

/** The pod's pictures: a thumbnail grid with Add and per-image delete. */
export function PodImagesField({ fields, disabled, onAdd, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
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
        {!disabled && onAdd && (
          <DuncitButton size="small" startIcon={<AddPhotoAlternateIcon />} onClick={onAdd}>
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
              {!disabled && (
                <DuncitIconButton
                  size="small"
                  onClick={() => onRemove(index)}
                  aria-label={t('shell.common.delete')}
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
  );
}
