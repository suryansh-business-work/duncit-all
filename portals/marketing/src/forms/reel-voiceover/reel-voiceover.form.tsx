import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { optionsOf } from '../../pages/reels/editor/labels';
import { VOICE_LABEL } from '../../pages/reels/studio/create/voices';
import { RhfSelectField } from '../reel-live';
import {
  MAX_VOICEOVER_LENGTH,
  buildReelVoiceoverSchema,
  reelVoiceoverInitialValues,
  type ReelVoiceoverFormProps,
  type ReelVoiceoverFormValues,
} from './reel-voiceover.types';

/** A voiceover: the words, the voice and the language — spoken by the server into a sound file the reel can play. */
export default function ReelVoiceoverForm({ initialText = '', languages, defaultLanguage, submitting, onSubmit }: Readonly<ReelVoiceoverFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildReelVoiceoverSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<ReelVoiceoverFormValues, unknown, ReelVoiceoverFormValues>({
    defaultValues: reelVoiceoverInitialValues(initialText, defaultLanguage),
    resolver: zodResolver(schema) as unknown as Resolver<ReelVoiceoverFormValues, unknown, ReelVoiceoverFormValues>,
    mode: 'onChange',
  });

  return (
    <Stack component="form" spacing={1.5} noValidate onSubmit={handleSubmit((values) => onSubmit(values))} data-testid="reel-voiceover-form">
      <RhfTextField
        control={control}
        name="text"
        label={t('ai.reels.voice.fieldText')}
        hint={t('ai.reels.voice.fieldTextHint')}
        multiline
        minRows={3}
        maxRows={10}
        size="small"
        required
        slotProps={{ htmlInput: { maxLength: MAX_VOICEOVER_LENGTH, 'data-testid': 'reel-voiceover-text' } }}
      />
      <RhfSelectField control={control} name="voice" label={t('ai.reels.voice.fieldVoice')} options={optionsOf(VOICE_LABEL, t)} />
      <RhfSelectField control={control} name="language" label={t('ai.reels.voice.fieldLanguage')} options={languages} />
      <DuncitButton
        type="submit"
        variant="contained"
        startIcon={<RecordVoiceOverIcon />}
        loading={submitting}
        disabled={!formState.isValid}
        sx={{ alignSelf: 'flex-start' }}
        data-testid="reel-voiceover-submit"
      >
        {t('ai.reels.voice.generate')}
      </DuncitButton>
    </Stack>
  );
}
