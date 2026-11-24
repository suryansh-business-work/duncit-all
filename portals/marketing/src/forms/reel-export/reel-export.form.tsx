import { useEffect, useMemo } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfSelect, RhfSwitch, RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { codecOptions, containerOptions, hardwareOptions, qualityOptions, scaleOptions } from './reel-export.options';
import { CODECS_BY_CONTAINER, buildReelExportSchema, exportDefaults, isAudioOnly, type ReelExportFormProps, type ReelExportFormValues } from './reel-export.types';

const ROW_SX = { display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 } as const;

/**
 * Export options, before the render starts: file type and codec, quality,
 * resolution, the stretch of the reel, sound, and how the browser encodes.
 * The defaults are the file every network takes, so pressing Export without
 * touching anything is always right.
 */
export default function ReelExportForm({ open, durationS, initialValues, onClose, onSubmit }: Readonly<ReelExportFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildReelExportSchema(t, durationS), [t, durationS]);
  const startValues = useMemo(() => initialValues ?? exportDefaults(durationS), [initialValues, durationS]);
  const { control, handleSubmit, reset, setValue, getValues, formState } = useForm<ReelExportFormValues, unknown, ReelExportFormValues>({
    defaultValues: startValues,
    resolver: zodResolver(schema) as unknown as Resolver<ReelExportFormValues, unknown, ReelExportFormValues>,
    mode: 'onChange',
  });
  const container = useWatch({ control, name: 'container' });
  const muted = useWatch({ control, name: 'muted' });
  const audioOnly = isAudioOnly(container);

  useEffect(() => {
    if (open) reset(startValues);
  }, [open, reset, startValues]);

  // A file type that cannot carry the chosen codec takes its own first one; a
  // sound-only file cannot be muted, and its switch is hidden, so it is unset.
  useEffect(() => {
    const allowed = CODECS_BY_CONTAINER[container];
    if (allowed.length > 0 && !allowed.includes(getValues('video_codec'))) {
      setValue('video_codec', allowed[0], { shouldValidate: true });
    }
    if (allowed.length === 0 && getValues('muted')) setValue('muted', false, { shouldValidate: true });
  }, [container, getValues, setValue]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="reel-export-form-title">
      <form noValidate onSubmit={submit} data-testid="reel-export-form">
        <DialogTitle id="reel-export-form-title">{t('ai.reels.exportOptions.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('ai.reels.exportOptions.intro')}
            </Typography>
            <Stack sx={ROW_SX}>
              <RhfSelect control={control} name="container" label={t('ai.reels.exportOptions.container')} options={containerOptions(t)} slotProps={{ htmlInput: { 'data-testid': 'reel-export-container' } }} />
              {!audioOnly && (
                <RhfSelect control={control} name="video_codec" label={t('ai.reels.exportOptions.codec')} options={codecOptions(t, container)} hint={t('ai.reels.exportOptions.codecHint')} slotProps={{ htmlInput: { 'data-testid': 'reel-export-codec' } }} />
              )}
            </Stack>
            <Stack sx={ROW_SX}>
              {!audioOnly && (
                <RhfSelect control={control} name="video_quality" label={t('ai.reels.exportOptions.videoQuality')} options={qualityOptions(t)} slotProps={{ htmlInput: { 'data-testid': 'reel-export-video-quality' } }} />
              )}
              {!muted && (
                <RhfSelect control={control} name="audio_quality" label={t('ai.reels.exportOptions.audioQuality')} options={qualityOptions(t)} slotProps={{ htmlInput: { 'data-testid': 'reel-export-audio-quality' } }} />
              )}
            </Stack>
            {!audioOnly && (
              <Stack sx={ROW_SX}>
                <RhfSelect control={control} name="scale" label={t('ai.reels.exportOptions.scale')} options={scaleOptions(t)} hint={t('ai.reels.exportOptions.scaleHint')} slotProps={{ htmlInput: { 'data-testid': 'reel-export-scale' } }} />
                <RhfTextField control={control} name="keyframe_s" type="number" label={t('ai.reels.exportOptions.keyframe')} hint={t('ai.reels.exportOptions.keyframeHint')} slotProps={{ htmlInput: { min: 1, max: 10, step: 1, 'data-testid': 'reel-export-keyframe' } }} />
              </Stack>
            )}
            <Stack sx={ROW_SX}>
              <RhfTextField control={control} name="from_s" type="number" label={t('ai.reels.exportOptions.from')} slotProps={{ htmlInput: { min: 0, max: durationS, step: 0.1, 'data-testid': 'reel-export-from' } }} />
              <RhfTextField control={control} name="to_s" type="number" label={t('ai.reels.exportOptions.to')} hint={t('ai.reels.exportOptions.rangeHint')} slotProps={{ htmlInput: { min: 0, max: durationS, step: 0.1, 'data-testid': 'reel-export-to' } }} />
            </Stack>
            {!audioOnly && <RhfSwitch control={control} name="muted" label={t('ai.reels.exportOptions.muted')} hint={t('ai.reels.exportOptions.mutedHint')} />}
            <RhfSelect control={control} name="hardware" label={t('ai.reels.exportOptions.hardware')} options={hardwareOptions(t)} hint={t('ai.reels.exportOptions.hardwareHint')} slotProps={{ htmlInput: { 'data-testid': 'reel-export-hardware' } }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={() => reset(exportDefaults(durationS))} data-testid="reel-export-defaults">
            {t('ai.reels.exportOptions.defaults')}
          </DuncitButton>
          <DuncitButton onClick={onClose} data-testid="reel-export-cancel">
            {t('shell.common.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" disabled={!formState.isValid} data-testid="reel-export-submit">
            {t('ai.reels.exportOptions.start')}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
