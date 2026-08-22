import { useRef } from 'react';
import { Box, Button, FormHelperText, IconButton, Stack, Typography } from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from '../../i18n';
import { MAX_SCREENSHOTS } from './report-issue.types';
import type { ScreenshotDraft } from './useScreenshots';

interface Props {
  shots: ScreenshotDraft[];
  error: string;
  disabled: boolean;
  onAdd: (files: FileList | null) => void;
  onRemove: (id: string) => void;
}

/**
 * Attach a picture of what went wrong.
 *
 * A screenshot carries the error text, the address bar and the state of the
 * page in one go — three things a person in a hurry does not type out, and the
 * three an engineer opens the report hoping to find.
 */
export default function ScreenshotField({
  shots,
  error,
  disabled,
  onAdd,
  onRemove,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Typography variant="body2" fontWeight={700}>
          {t('status.report.screenshots')}
        </Typography>
        <Button
          size="small"
          startIcon={<AddPhotoAlternateOutlinedIcon />}
          onClick={() => input.current?.click()}
          disabled={disabled || shots.length >= MAX_SCREENSHOTS}
        >
          {t('status.report.addScreenshot')}
        </Button>
      </Stack>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          onAdd(event.target.files);
          // Cleared so picking the SAME file again still fires a change event.
          event.target.value = '';
        }}
      />
      <FormHelperText error={!!error}>
        {error || t('status.report.screenshotsHelp')}
      </FormHelperText>
      {shots.length > 0 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          {shots.map((shot) => (
            <Box key={shot.id} sx={{ position: 'relative' }}>
              <Box
                component="img"
                src={shot.data}
                alt={shot.file_name}
                sx={{
                  width: 96,
                  height: 96,
                  objectFit: 'cover',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider',
                  display: 'block',
                }}
              />
              <IconButton
                size="small"
                aria-label={t('status.report.removeScreenshot')}
                onClick={() => onRemove(shot.id)}
                disabled={disabled}
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  bgcolor: 'background.paper',
                  '&:hover': { bgcolor: 'background.paper' },
                }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
