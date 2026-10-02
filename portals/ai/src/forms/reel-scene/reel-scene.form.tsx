import { useCallback, useMemo } from 'react';
import { Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { FIT_LABEL, MOTION_LABEL, TRANSITION_LABEL, optionsOf } from '../../pages/reels/editor/labels';
import { RhfSelectField, useLiveForm } from '../reel-live';
import {
  buildReelSceneSchema,
  formToScene,
  sceneToForm,
  type ReelSceneFormProps,
  type ReelSceneFormValues,
} from './reel-scene.types';

/** The selected scene's footage, timing and look — applied as they are typed. */
export default function ReelSceneForm({ scene, footage, isVideo, maxSeconds, onChange }: Readonly<ReelSceneFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildReelSceneSchema(t, maxSeconds), [t, maxSeconds]);
  const values = useMemo(() => sceneToForm(scene), [scene]);
  const apply = useCallback((next: ReelSceneFormValues) => onChange(formToScene(next)), [onChange]);
  const { control } = useLiveForm(schema, values, apply);

  return (
    <Stack spacing={1.5} component="form" noValidate onSubmit={(event) => event.preventDefault()} data-testid="reel-scene-form">
      <RhfSelectField control={control} name="asset_id" label={t('ai.reels.editor.fieldFootage')} options={footage} />
      <RhfTextField
        control={control}
        name="duration_s"
        label={t('ai.reels.editor.fieldDuration')}
        type="number"
        size="small"
        slotProps={{ htmlInput: { step: 0.1, min: 0.5, max: maxSeconds, 'data-testid': 'reel-scene-duration' } }}
      />
      {isVideo && (
        <>
          <RhfTextField
            control={control}
            name="trim_s"
            label={t('ai.reels.editor.fieldTrim')}
            type="number"
            size="small"
            slotProps={{ htmlInput: { step: 0.1, min: 0, 'data-testid': 'reel-scene-trim' } }}
          />
          <RhfTextField
            control={control}
            name="speed"
            label={t('ai.reels.editor.fieldSpeed')}
            type="number"
            size="small"
            slotProps={{ htmlInput: { step: 0.25, min: 0.25, max: 4, 'data-testid': 'reel-scene-speed' } }}
          />
          <RhfTextField
            control={control}
            name="volume_pct"
            label={t('ai.reels.editor.fieldVolume')}
            type="number"
            size="small"
            slotProps={{ htmlInput: { step: 5, min: 0, max: 100, 'data-testid': 'reel-scene-volume' } }}
          />
        </>
      )}
      <RhfSelectField control={control} name="fit" label={t('ai.reels.editor.fieldFit')} options={optionsOf(FIT_LABEL, t)} />
      <RhfSelectField control={control} name="motion" label={t('ai.reels.editor.fieldMotion')} options={optionsOf(MOTION_LABEL, t)} />
      <RhfSelectField
        control={control}
        name="transition"
        label={t('ai.reels.editor.fieldTransition')}
        options={optionsOf(TRANSITION_LABEL, t)}
      />
      <RhfTextField
        control={control}
        name="background"
        label={t('ai.reels.editor.fieldBackground')}
        type="color"
        size="small"
        slotProps={{ htmlInput: { 'data-testid': 'reel-scene-background' } }}
      />
    </Stack>
  );
}
