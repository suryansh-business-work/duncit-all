import { useCallback, useMemo } from 'react';
import { Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { ANIMATION_LABEL, POSITION_LABEL, STYLE_LABEL, optionsOf } from '../../pages/reels/editor/labels';
import { REEL_EDIT_LIMITS } from '../../pages/reels/editor/limits';
import { RhfSelectField, useLiveForm } from '../reel-live';
import { buildReelTextSchema, formToText, textToForm, type ReelTextFormProps, type ReelTextFormValues } from './reel-text.types';

/** The selected text: its words, where and how it shows, and when. */
export default function ReelTextForm({ text, sceneSeconds, onChange }: Readonly<ReelTextFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildReelTextSchema(t, sceneSeconds), [t, sceneSeconds]);
  const values = useMemo(() => textToForm(text), [text]);
  const apply = useCallback((next: ReelTextFormValues) => onChange(formToText(next)), [onChange]);
  const { control } = useLiveForm(schema, values, apply);
  const seconds = { step: 0.1, min: 0, max: sceneSeconds };

  return (
    <Stack spacing={1.5} component="form" noValidate onSubmit={(event) => event.preventDefault()} data-testid="reel-text-form">
      <RhfTextField
        control={control}
        name="text"
        label={t('ai.reels.editor.fieldWords')}
        multiline
        minRows={2}
        size="small"
        required
        slotProps={{ htmlInput: { maxLength: REEL_EDIT_LIMITS.maxTextLength, 'data-testid': 'reel-text-words' } }}
      />
      <RhfSelectField control={control} name="position" label={t('ai.reels.editor.fieldPosition')} options={optionsOf(POSITION_LABEL, t)} />
      <RhfSelectField control={control} name="style" label={t('ai.reels.editor.fieldStyle')} options={optionsOf(STYLE_LABEL, t)} />
      <RhfSelectField
        control={control}
        name="animation"
        label={t('ai.reels.editor.fieldAnimation')}
        options={optionsOf(ANIMATION_LABEL, t)}
      />
      <RhfTextField
        control={control}
        name="start_s"
        label={t('ai.reels.editor.fieldStart')}
        type="number"
        size="small"
        slotProps={{ htmlInput: { ...seconds, 'data-testid': 'reel-text-start' } }}
      />
      <RhfTextField
        control={control}
        name="duration_s"
        label={t('ai.reels.editor.fieldStays')}
        hint={t('ai.reels.editor.fieldStaysHint')}
        type="number"
        size="small"
        slotProps={{ htmlInput: { ...seconds, 'data-testid': 'reel-text-duration' } }}
      />
      <RhfTextField
        control={control}
        name="color"
        label={t('ai.reels.editor.fieldColor')}
        type="color"
        size="small"
        slotProps={{ htmlInput: { 'data-testid': 'reel-text-color' } }}
      />
      <RhfTextField
        control={control}
        name="background"
        label={t('ai.reels.editor.fieldPill')}
        hint={t('ai.reels.editor.fieldPillHint')}
        size="small"
        slotProps={{ htmlInput: { maxLength: 7, 'data-testid': 'reel-text-pill' } }}
      />
    </Stack>
  );
}
