import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, Typography } from '@mui/material';
import SubtitlesIcon from '@mui/icons-material/Subtitles';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { RhfSelectField } from '../reel-live';
import { buildReelSubtitlesSchema, type ReelSubtitlesFormProps, type ReelSubtitlesFormValues } from './reel-subtitles.types';

/** Subtitles: pick the sound the words are in, say its language, and the server writes them onto the scenes. */
export default function ReelSubtitlesForm({ sources, languages, defaultLanguage, submitting, onSubmit }: Readonly<ReelSubtitlesFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildReelSubtitlesSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<ReelSubtitlesFormValues, unknown, ReelSubtitlesFormValues>({
    defaultValues: { asset_id: sources[0]?.value ?? '', language: defaultLanguage },
    resolver: zodResolver(schema) as unknown as Resolver<ReelSubtitlesFormValues, unknown, ReelSubtitlesFormValues>,
    mode: 'onChange',
  });

  if (sources.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="reel-subtitles-no-sources">
        {t('ai.reels.voice.subtitlesNoSources')}
      </Typography>
    );
  }

  return (
    <Stack component="form" spacing={1.5} noValidate onSubmit={handleSubmit((values) => onSubmit(values))} data-testid="reel-subtitles-form">
      <RhfSelectField control={control} name="asset_id" label={t('ai.reels.voice.fieldSubtitlesSource')} options={sources} />
      <RhfSelectField control={control} name="language" label={t('ai.reels.voice.fieldLanguage')} options={languages} />
      <DuncitButton
        type="submit"
        variant="outlined"
        startIcon={<SubtitlesIcon />}
        loading={submitting}
        disabled={!formState.isValid}
        sx={{ alignSelf: 'flex-start' }}
        data-testid="reel-subtitles-submit"
      >
        {t('ai.reels.voice.generateSubtitles')}
      </DuncitButton>
    </Stack>
  );
}
