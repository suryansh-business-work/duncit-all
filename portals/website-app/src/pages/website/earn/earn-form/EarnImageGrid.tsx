import { Box, IconButton, Stack, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import { useTranslation } from '@duncit/shell';

interface Props {
  images: string[];
  disabled: boolean;
  onChange: (next: string[]) => void;
}

const move = (list: string[], from: number, to: number) => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

/** The photos in wall order — each can move one step either way or be removed. */
export default function EarnImageGrid({ images, disabled, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  if (images.length === 0) return null;

  return (
    <Box
      component="ul"
      aria-label={t('websiteApp.earn.imagesList')}
      sx={{
        listStyle: 'none',
        p: 0,
        m: 0,
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      }}
    >
      {images.map((url, index) => {
        const vars = { vars: { n: index + 1 } };
        return (
          <Box component="li" key={url} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            <Box
              component="img"
              src={url}
              alt={t('websiteApp.earn.imageAlt', vars)}
              loading="lazy"
              sx={{ display: 'block', width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', bgcolor: 'action.hover' }}
            />
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Tooltip title={t('websiteApp.earn.imageMoveLeft', vars)}>
                <span>
                  <IconButton
                    size="small"
                    aria-label={t('websiteApp.earn.imageMoveLeft', vars)}
                    disabled={disabled || index === 0}
                    onClick={() => onChange(move(images, index, index - 1))}
                  >
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t('websiteApp.earn.imageRemove', vars)}>
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    aria-label={t('websiteApp.earn.imageRemove', vars)}
                    disabled={disabled}
                    onClick={() => onChange(images.filter((_, i) => i !== index))}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t('websiteApp.earn.imageMoveRight', vars)}>
                <span>
                  <IconButton
                    size="small"
                    aria-label={t('websiteApp.earn.imageMoveRight', vars)}
                    disabled={disabled || index === images.length - 1}
                    onClick={() => onChange(move(images, index, index + 1))}
                  >
                    <ArrowForwardIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
}
