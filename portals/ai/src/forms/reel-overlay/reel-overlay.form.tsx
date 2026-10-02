import { useCallback, useMemo } from 'react';
import { Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { CORNER_LABEL, optionsOf } from '../../pages/reels/editor/labels';
import { RhfSelectField, useLiveForm } from '../reel-live';
import {
  buildReelOverlaySchema,
  formToOverlay,
  overlayToForm,
  type ReelOverlayFormProps,
  type ReelOverlayFormValues,
} from './reel-overlay.types';

/** The selected overlay: where it sits, how big and how solid, and when. */
export default function ReelOverlayForm({ overlay, sceneSeconds, onChange }: Readonly<ReelOverlayFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildReelOverlaySchema(t, sceneSeconds), [t, sceneSeconds]);
  const values = useMemo(() => overlayToForm(overlay), [overlay]);
  const apply = useCallback((next: ReelOverlayFormValues) => onChange(formToOverlay(next)), [onChange]);
  const { control } = useLiveForm(schema, values, apply);
  const seconds = { step: 0.1, min: 0, max: sceneSeconds };

  return (
    <Stack spacing={1.5} component="form" noValidate onSubmit={(event) => event.preventDefault()} data-testid="reel-overlay-form">
      <RhfSelectField control={control} name="corner" label={t('ai.reels.editor.fieldCorner')} options={optionsOf(CORNER_LABEL, t)} />
      <RhfTextField
        control={control}
        name="width_pct"
        label={t('ai.reels.editor.fieldWidth')}
        type="number"
        size="small"
        slotProps={{ htmlInput: { step: 1, min: 5, max: 100, 'data-testid': 'reel-overlay-width' } }}
      />
      <RhfTextField
        control={control}
        name="opacity_pct"
        label={t('ai.reels.editor.fieldOpacity')}
        type="number"
        size="small"
        slotProps={{ htmlInput: { step: 5, min: 10, max: 100, 'data-testid': 'reel-overlay-opacity' } }}
      />
      <RhfTextField
        control={control}
        name="start_s"
        label={t('ai.reels.editor.fieldStart')}
        type="number"
        size="small"
        slotProps={{ htmlInput: { ...seconds, 'data-testid': 'reel-overlay-start' } }}
      />
      <RhfTextField
        control={control}
        name="duration_s"
        label={t('ai.reels.editor.fieldStays')}
        hint={t('ai.reels.editor.fieldStaysHint')}
        type="number"
        size="small"
        slotProps={{ htmlInput: { ...seconds, 'data-testid': 'reel-overlay-duration' } }}
      />
    </Stack>
  );
}
