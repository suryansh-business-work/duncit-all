import { useCallback, useMemo } from 'react';
import { Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { useLiveForm } from '../reel-live';
import { buildReelMusicSchema, formToMusic, musicToForm, type ReelMusicFormProps, type ReelMusicFormValues } from './reel-music.types';

/** The reel's music: its volume under the footage, and where the song starts. */
export default function ReelMusicForm({ music, onChange }: Readonly<ReelMusicFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildReelMusicSchema(t), [t]);
  const values = useMemo(() => musicToForm(music), [music]);
  const apply = useCallback((next: ReelMusicFormValues) => onChange(formToMusic(next)), [onChange]);
  const { control } = useLiveForm(schema, values, apply);

  return (
    <Stack spacing={1.5} component="form" noValidate onSubmit={(event) => event.preventDefault()} data-testid="reel-music-form">
      <RhfTextField
        control={control}
        name="volume_pct"
        label={t('ai.reels.editor.fieldVolume')}
        type="number"
        size="small"
        slotProps={{ htmlInput: { step: 5, min: 0, max: 100, 'data-testid': 'reel-music-volume' } }}
      />
      <RhfTextField
        control={control}
        name="trim_s"
        label={t('ai.reels.editor.fieldMusicTrim')}
        type="number"
        size="small"
        slotProps={{ htmlInput: { step: 0.5, min: 0, 'data-testid': 'reel-music-trim' } }}
      />
    </Stack>
  );
}
