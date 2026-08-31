import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTranslation } from './i18n/useTranslation';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitRoundButton } from '@duncit/buttons';

interface Props {
  urls: string[];
  max: number;
  onRemove: (url: string) => void;
}

/**
 * What the user has picked so far, across both tabs.
 *
 * Numbered, because the first image is the cover — a grid that only ticks the
 * chosen ones leaves "which one is the cover?" unanswered.
 */
export default function SelectionTray({ urls, max, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Box sx={{ mb: 2 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          mb: 1
        }}>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          Selected
        </Typography>
        <Chip size="small" label={`${urls.length} of ${max}`} color={urls.length ? 'primary' : 'default'} />
        {urls.length > 0 && (
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            The first one is the cover.
          </Typography>
        )}
      </Stack>
      {urls.length === 0 ? (
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          Pick up to {max} — from your device, from Pexels, or both.
        </Typography>
      ) : (
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
          {urls.map((url, index) => (
            <Box
              key={url}
              sx={{
                position: 'relative',
                flex: '0 0 auto',
                width: 84,
                height: 84,
                borderRadius: '12px',
                overflow: 'hidden',
                border: 1,
                borderColor: index === 0 ? 'primary.main' : 'divider',
              }}
            >
              <Box
                component="img"
                src={url}
                alt=""
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  left: 4,
                  bottom: 4,
                  px: 0.75,
                  borderRadius: '8px',
                  bgcolor: (theme) => alpha(theme.palette.common.black, 0.62),
                  color: (theme) => theme.palette.common.white,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {index + 1}
              </Box>
              <DuncitRoundButton
                size="small"
                tone="overlay"
                aria-label={t('media.picker.remove')}
                onClick={() => onRemove(url)}
                sx={{ position: 'absolute', right: 2, top: 2 }}
              >
                <CloseIcon />
              </DuncitRoundButton>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
