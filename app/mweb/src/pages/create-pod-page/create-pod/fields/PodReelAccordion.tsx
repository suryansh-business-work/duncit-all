import { useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  CircularProgress,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useApolloClient } from '@apollo/client/react';
import { AiMonitoringChip } from '@duncit/ai-monitoring/mui';
import { MB, compressUploadedVideo, useImagekitDirectUpload, useUploadCaps } from '@duncit/media-picker';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { CreatePodForm } from '../create-pod.types';

const VIDEO_URL_RE = /\.(mp4|mov|webm)$/i;

const isVideoFile = (file: File) =>
  file.type.startsWith('video/') || VIDEO_URL_RE.test(file.name);

interface Props {
  form: CreatePodForm;
}

/** Step 1 "Pod Reel" accordion — an optional short video uploaded DIRECTLY to
 * ImageKit (folder /pods/reels); it plays in Explore while the pod is live. */
export default function PodReelAccordion({ form }: Readonly<Props>) {
  const [error, setError] = useState<string | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [stage, setStage] = useState<'upload' | 'compress'>('upload');
  const { t } = useTranslation();
  const client = useApolloClient();
  const { upload, uploading } = useImagekitDirectUpload();
  // The reel is a video like any other: Admin > Upload Settings sizes it.
  const caps = useUploadCaps('MWEB');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const reelUrl = form.watch('reel_url');
  const hasReel = !!reelUrl;

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isVideoFile(file)) {
      setError(t('mweb.createPod.reelNotVideo'));
      return;
    }
    if (file.size > caps.maxVideoBytes) {
      setError(
        t('mweb.createPod.reelOverCap', {
          vars: { max: Math.round(caps.maxVideoBytes / MB) },
        })
      );
      return;
    }
    setError(null);
    setStage('upload');
    setPct(0);
    try {
      // Real byte progress, then the server-side FFmpeg pass (no-op when the
      // admin has video compression off) with its real percentage too.
      const rawUrl = await upload(file, '/pods/reels', setPct);
      setStage('compress');
      setPct(0);
      const url = await compressUploadedVideo(client, rawUrl, '/pods/reels', 'MWEB', setPct);
      if (url) form.setValue('reel_url', url, { shouldDirty: true });
    } catch (err: any) {
      setError(err?.message || t('mweb.createPod.uploadFailed'));
    } finally {
      setPct(null);
    }
  };

  const removeReel = () => form.setValue('reel_url', '', { shouldDirty: true });

  const busy = uploading || pct !== null;
  const idleLabel = hasReel ? t('mweb.createPod.reelReplace') : t('mweb.createPod.reelUpload');
  const busyLabel =
    stage === 'upload' ? t('mweb.createPod.uploading') : t('mweb.createPod.compressing');
  const uploadLabel = busy ? busyLabel : idleLabel;
  const progressLabel =
    stage === 'upload'
      ? t('mweb.createPod.uploadingPct', { vars: { pct: pct ?? 0 } })
      : t('mweb.createPod.compressingPct', { vars: { pct: pct ?? 0 } });

  return (
    <Accordion
      disableGutters
      square
      sx={{
        '&:before': { display: 'none' },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: 'none',
        bgcolor: 'background.paper',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ minHeight: 56 }}
        aria-controls="pod-reel-content"
        id="pod-reel-header"
      >
        <Stack
          direction="row"
          spacing={1.25}
          sx={{
            alignItems: "center",
            flex: 1
          }}>
          <MovieOutlinedIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2" sx={{
            fontWeight: 700
          }}>{t('mweb.createPod.podReel')}</Typography>
          {hasReel && <Chip label={t('mweb.createPod.summaryAdded')} size="small" color="primary" />}
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.25}>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {t('mweb.createPod.reelCapHint', { vars: { max: Math.round(caps.maxVideoBytes / MB) } })}
          </Typography>
          <Box>
            <AiMonitoringChip />
          </Box>
          {hasReel && (
            <Box
              component="video"
              src={reelUrl}
              controls
              playsInline
              sx={{ width: '100%', maxHeight: 320, borderRadius: '16px', bgcolor: 'common.black' }}
            />
          )}
          {error && (
            <Chip
              size="small"
              color="error"
              label={error}
              onDelete={() => setError(null)}
              sx={{ alignSelf: 'flex-start' }}
            />
          )}
          {pct !== null && (
            <Box>
              <LinearProgress variant="determinate" value={pct} />
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {progressLabel}
              </Typography>
            </Box>
          )}
          <Stack direction="row" spacing={1}>
            <DuncitButton
              size="small"
              variant="outlined"
              startIcon={busy ? <CircularProgress size={16} /> : <VideocamOutlinedIcon />}
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {uploadLabel}
            </DuncitButton>
            {hasReel && !busy && (
              <DuncitButton size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={removeReel}>
                {t('mweb.createPod.remove')}
              </DuncitButton>
            )}
          </Stack>
          <input ref={fileRef} type="file" accept="video/*" hidden onChange={pickFile} />
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
