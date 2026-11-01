import { useCallback, useMemo } from 'react';
import { Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { ASPECT_LABEL, CAPTION_STYLE_LABEL, CORNER_LABEL, optionsOf } from '../../pages/reels/editor/labels';
import { REEL_EDIT_LIMITS } from '../../pages/reels/editor/limits';
import { RhfSelectField, useLiveForm } from '../reel-live';
import {
  MAX_WATERMARK_PCT,
  buildReelSettingsSchema,
  formToSettings,
  settingsToForm,
  type ReelSettingsFormProps,
  type ReelSettingsFormValues,
} from './reel-settings.types';

/** The reel's own settings — frame, captions, brand, voiceover — applied as they are changed. */
export default function ReelSettingsForm({ spec, pictures, onChange }: Readonly<ReelSettingsFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildReelSettingsSchema(t), [t]);
  const values = useMemo(() => settingsToForm(spec), [spec]);
  const apply = useCallback((next: ReelSettingsFormValues) => onChange(formToSettings(next)), [onChange]);
  const { control, watch } = useLiveForm(schema, values, apply);
  const watermarkOptions = useMemo(() => [{ value: '', label: t('ai.reels.settings.noWatermark') }, ...pictures], [pictures, t]);
  const hasWatermark = watch('watermark_asset_id') !== '';

  return (
    <Stack spacing={1.5} component="form" noValidate onSubmit={(event) => event.preventDefault()} data-testid="reel-settings-form">
      <RhfSelectField control={control} name="aspect" label={t('ai.reels.settings.fieldAspect')} options={optionsOf(ASPECT_LABEL, t)} />
      <RhfSelectField
        control={control}
        name="caption_style"
        label={t('ai.reels.settings.fieldCaptions')}
        options={optionsOf(CAPTION_STYLE_LABEL, t)}
      />
      <RhfTextField
        control={control}
        name="primary_color"
        label={t('ai.reels.settings.fieldPrimaryColor')}
        hint={t('ai.reels.settings.fieldPrimaryColorHint')}
        size="small"
        slotProps={{ htmlInput: { maxLength: 7, 'data-testid': 'reel-settings-primary-color' } }}
      />
      <RhfSelectField control={control} name="watermark_asset_id" label={t('ai.reels.settings.fieldWatermark')} options={watermarkOptions} />
      {hasWatermark && (
        <>
          <RhfSelectField
            control={control}
            name="watermark_corner"
            label={t('ai.reels.settings.fieldWatermarkCorner')}
            options={optionsOf(CORNER_LABEL, t)}
          />
          <RhfTextField
            control={control}
            name="watermark_width_pct"
            label={t('ai.reels.settings.fieldWatermarkWidth')}
            type="number"
            size="small"
            slotProps={{
              htmlInput: { step: 1, min: REEL_EDIT_LIMITS.minOverlayWidth, max: MAX_WATERMARK_PCT, 'data-testid': 'reel-settings-watermark-width' },
            }}
          />
        </>
      )}
      {spec.voiceover && (
        <RhfTextField
          control={control}
          name="voiceover_volume_pct"
          label={t('ai.reels.settings.fieldVoiceoverVolume')}
          type="number"
          size="small"
          slotProps={{ htmlInput: { step: 5, min: 0, max: 100, 'data-testid': 'reel-settings-voiceover-volume' } }}
        />
      )}
    </Stack>
  );
}
