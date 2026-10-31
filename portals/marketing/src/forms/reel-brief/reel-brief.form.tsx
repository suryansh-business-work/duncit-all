import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { optionsOf } from '../../pages/reels/editor/labels';
import { REEL_LENGTHS_S, TONE_LABEL } from '../../pages/reels/studio/create/voices';
import { RhfSelectField } from '../reel-live';
import {
  MAX_AUDIENCE_LENGTH,
  MAX_TOPIC_LENGTH,
  buildReelBriefSchema,
  reelBriefInitialValues,
  type ReelBriefFormProps,
  type ReelBriefFormValues,
} from './reel-brief.types';

/** The first step of Create: what the reel is about, for whom, in what tone, and how long. */
export default function ReelBriefForm({ initialValues, submitting, onSubmit }: Readonly<ReelBriefFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildReelBriefSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<ReelBriefFormValues, unknown, ReelBriefFormValues>({
    defaultValues: initialValues ?? reelBriefInitialValues,
    resolver: zodResolver(schema) as unknown as Resolver<ReelBriefFormValues, unknown, ReelBriefFormValues>,
    mode: 'onChange',
  });
  const lengths = useMemo(
    () => REEL_LENGTHS_S.map((seconds) => ({ value: String(seconds), label: t('ai.reels.create.lengthSeconds', { vars: { seconds } }) })),
    [t]
  );

  return (
    <Stack component="form" spacing={1.5} noValidate onSubmit={handleSubmit(onSubmit)} data-testid="reel-brief-form">
      <RhfTextField
        control={control}
        name="topic"
        label={t('ai.reels.create.fieldTopic')}
        hint={t('ai.reels.create.fieldTopicHint')}
        multiline
        minRows={2}
        size="small"
        required
        slotProps={{ htmlInput: { maxLength: MAX_TOPIC_LENGTH, 'data-testid': 'reel-brief-topic' } }}
      />
      <RhfTextField
        control={control}
        name="audience"
        label={t('ai.reels.create.fieldAudience')}
        hint={t('ai.reels.create.fieldAudienceHint')}
        size="small"
        slotProps={{ htmlInput: { maxLength: MAX_AUDIENCE_LENGTH, 'data-testid': 'reel-brief-audience' } }}
      />
      <RhfSelectField control={control} name="tone" label={t('ai.reels.create.fieldTone')} options={optionsOf(TONE_LABEL, t)} />
      <RhfSelectField control={control} name="length_s" label={t('ai.reels.create.fieldLength')} options={lengths} />
      <DuncitButton
        type="submit"
        variant="contained"
        startIcon={<AutoAwesomeIcon />}
        loading={submitting}
        disabled={!formState.isValid}
        sx={{ alignSelf: 'flex-start' }}
        data-testid="reel-brief-submit"
      >
        {t('ai.reels.create.findIdeas')}
      </DuncitButton>
    </Stack>
  );
}
