import { useRef, type ChangeEvent } from 'react';
import { Box, LinearProgress, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { DuncitButton } from '@duncit/buttons';
import { MB } from '@duncit/media-picker';
import { useTranslation, type Translate } from '@duncit/shell';
import type { ReelActions } from '../useReelActions';
import { useReelUploads, type UploadRow } from './useReelUploads';

interface Props {
  actions: ReelActions;
}

/** What a row says under its name, by where it has got to. */
function rowStatus(row: UploadRow, t: Translate): string {
  switch (row.phase) {
    case 'uploading':
      return t('ai.reels.upload.uploading', { vars: { percent: row.progress } });
    case 'adding':
      return t('ai.reels.upload.adding');
    case 'done':
      return t('ai.reels.upload.done');
    case 'failed':
      return row.message;
    default:
      return t('ai.reels.upload.queued');
  }
}

/**
 * The operator's own files, straight from the device: pictures and clips,
 * each uploaded with its progress and added to the reel as it lands.
 */
export default function UploadTab({ actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const uploads = useReelUploads(actions.addUploads);
  const input = useRef<HTMLInputElement | null>(null);

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    // The input keeps its value, so re-choosing the SAME file would fire no change event.
    event.target.value = '';
    if (files.length > 0) uploads.add(files).catch(() => undefined);
  };

  return (
    <Stack sx={{ minHeight: 0, flex: 1 }} data-testid="reel-upload-tab">
      <Stack spacing={1} sx={{ px: 1.5, pt: 1, pb: 1 }}>
        <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={onPick} data-testid="reel-upload-input" />
        <DuncitButton variant="outlined" startIcon={<CloudUploadIcon />} disabled={uploads.busy} onClick={() => input.current?.click()} data-testid="reel-upload-pick">
          {t('ai.reels.upload.choose')}
        </DuncitButton>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('ai.reels.upload.hint', { vars: { image: Math.round(uploads.maxImageBytes / MB), video: Math.round(uploads.maxVideoBytes / MB) } })}
        </Typography>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {uploads.rows.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', px: 2, py: 1 }} data-testid="reel-upload-empty">
            {t('ai.reels.upload.empty')}
          </Typography>
        ) : (
          <List dense disablePadding aria-label={t('ai.reels.upload.listLabel')} data-testid="reel-upload-rows">
            {uploads.rows.map((row) => (
              <ListItem key={row.id} sx={{ display: 'block', py: 0.75 }} data-testid={`reel-upload-row-${row.id}`} data-phase={row.phase}>
                <ListItemText
                  primary={row.name}
                  secondary={rowStatus(row, t)}
                  slotProps={{
                    primary: { noWrap: true, variant: 'body2' },
                    secondary: { variant: 'caption', role: 'status', color: row.phase === 'failed' ? 'error' : 'text.secondary' },
                  }}
                />
                {row.phase === 'uploading' && <LinearProgress variant="determinate" value={row.progress} aria-label={t('ai.reels.upload.progressLabel', { vars: { name: row.name } })} />}
                {row.phase === 'adding' && <LinearProgress aria-label={t('ai.reels.upload.progressLabel', { vars: { name: row.name } })} />}
              </ListItem>
            ))}
          </List>
        )}
      </Box>
      {uploads.rows.some((row) => row.phase === 'done' || row.phase === 'failed') && (
        <DuncitButton size="small" variant="text" onClick={uploads.clearFinished} sx={{ alignSelf: 'flex-start', mx: 1.5, mb: 1 }} data-testid="reel-upload-clear">
          {t('ai.reels.upload.clearFinished')}
        </DuncitButton>
      )}
    </Stack>
  );
}
