import { useRef, useState, type DragEvent } from 'react';
import { Box, ButtonBase, LinearProgress, Typography } from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import { useCommonT } from '../i18n';
import { ACCEPTED_TYPES } from './picture.types';

interface DropZoneProps {
  /** The aspect ratio to recommend, e.g. 1:1. */
  ratio: string;
  maxMb: number;
  busy: boolean;
  onFile: (file: File) => void;
  testId: string;
}

/** Drop a picture here, or press it (mouse, Enter or Space) to choose one from the device. */
export function DropZone({ ratio, maxMb, busy, onFile, testId }: Readonly<DropZoneProps>) {
  const { t } = useCommonT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const take = (file: File | undefined) => {
    if (file && !busy) onFile(file);
  };
  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    setDragging(true);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    take(event.dataTransfer.files[0]);
  };

  return (
    <>
      <ButtonBase
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        aria-busy={busy}
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        focusRipple
        data-testid={testId}
        sx={{
          display: 'block',
          width: '100%',
          px: 2,
          py: 3,
          textAlign: 'center',
          borderRadius: 3,
          border: '2px dashed',
          borderColor: dragging ? 'primary.main' : 'divider',
          bgcolor: dragging ? 'action.selected' : 'action.hover',
          '&.Mui-focusVisible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 2 },
        }}
      >
        <CloudUploadOutlinedIcon color="action" aria-hidden />
        <Typography component="span" variant="subtitle1" sx={{ display: 'block', fontWeight: 700 }}>
          {busy ? t('lite.picture.uploading') : t('lite.picture.dropTitle')}
        </Typography>
        <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block' }}>
          {t('lite.picture.dropHint', { vars: { max: maxMb, ratio } })}
        </Typography>
        {busy ? (
          <Box sx={{ mt: 1.5 }}>
            <LinearProgress aria-label={t('lite.picture.uploading')} />
          </Box>
        ) : null}
      </ButtonBase>
      {/* MUI has no file control; the native one stays hidden behind the zone above. */}
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        hidden
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          take(event.target.files?.[0]);
          event.target.value = '';
        }}
        data-testid={`${testId}-input`}
      />
    </>
  );
}
