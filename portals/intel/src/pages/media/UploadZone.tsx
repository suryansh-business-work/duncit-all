import { useRef, useState, type DragEvent } from 'react';
import { Box, Button, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useTranslation } from '@duncit/app-settings';
import type { UploadItem } from './useUploads';

interface Props {
  items: UploadItem[];
  maxMb: number;
  /** MIME types the browser picker offers. */
  types: readonly string[];
  onFiles: (files: FileList) => void;
  onClear: () => void;
}

/** Drag files here or click to pick them (keyboard: Enter/Space). Shows each upload's progress. */
export default function UploadZone({ items, maxMb, types, onFiles, onClear }: Readonly<Props>) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement | null>(null);
  const [over, setOver] = useState(false);
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
  };
  const finished = items.some((i) => i.status === 'done' || i.status === 'failed');

  return (
    <Stack spacing={1.5}>
      <Paper
        variant="outlined"
        role="button"
        tabIndex={0}
        aria-label={t('intel.media.dropLabel')}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            input.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        sx={{ p: { xs: 2.5, md: 4 }, textAlign: 'center', borderStyle: 'dashed', borderWidth: 2, borderRadius: 3, cursor: 'pointer', borderColor: over ? 'primary.main' : 'divider', bgcolor: over ? 'action.hover' : 'transparent', transition: 'all .2s', '&:focus-visible': { outline: 2, outlineColor: 'primary.main' } }}
      >
        <CloudUploadIcon color="primary" sx={{ fontSize: 40 }} aria-hidden />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t('intel.media.dropTitle')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t('intel.media.dropHint', { vars: { max: maxMb } })}
        </Typography>
        <input
          ref={input}
          type="file"
          hidden
          multiple
          accept={types.join(',')}
          onChange={(e) => {
            if (e.target.files?.length) onFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </Paper>
      {items.length > 0 && (
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }} aria-live="polite">
          <Stack spacing={1}>
            {items.map((item) => (
              <Box key={item.id}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                  <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                    {item.name}
                  </Typography>
                  <Typography variant="caption" color={item.status === 'failed' ? 'error' : 'text.secondary'} sx={{ flexShrink: 0 }}>
                    {item.status === 'failed' ? item.error : `${item.progress}%`}
                  </Typography>
                </Stack>
                {item.status !== 'failed' && <LinearProgress variant="determinate" value={item.progress} color={item.status === 'done' ? 'success' : 'primary'} aria-label={item.name} />}
              </Box>
            ))}
          </Stack>
          {finished && (
            <Button size="small" onClick={onClear} sx={{ mt: 1 }}>
              {t('intel.media.clearFinished')}
            </Button>
          )}
        </Paper>
      )}
    </Stack>
  );
}
