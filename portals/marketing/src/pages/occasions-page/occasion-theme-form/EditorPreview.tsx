import { useDeferredValue, useMemo } from 'react';
import { useWatch, type Control } from 'react-hook-form';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import type { OccasionDesign } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { pinsColorMode } from '../preview/palette';
import ModeToggle from '../preview/ModeToggle';
import PhonePreview from '../preview/PhonePreview';
import { usePreviewMode } from '../preview/usePreviewMode';
import { toPreviewDesign, type PreviewSource } from './occasion-theme.mapping';
import type { OccasionThemeFormValues } from './occasion-theme.types';

/** Every field the preview draws from — description and region change nothing on screen. */
const DRAWN = ['name', 'color_mode', 'greeting', 'palette_light', 'palette_dark', 'particles', 'flyers', 'fireworks', 'overlays', 'garland'] as const;

/**
 * The look as it stands in the form, running on a phone — redrawn as the
 * marketer types and drags. The design is compared by content, so the canvas
 * restarts only when something it draws has actually changed.
 */
export default function EditorPreview({ control }: Readonly<{ control: Control<OccasionThemeFormValues> }>) {
  const { t } = useTranslation();
  const [mode, setMode] = usePreviewMode();
  const [name, color_mode, greeting, palette_light, palette_dark, particles, flyers, fireworks, overlays, garland] = useWatch({
    control,
    name: DRAWN,
  });
  const source: PreviewSource = { name, color_mode, greeting, palette_light, palette_dark, particles, flyers, fireworks, overlays, garland };
  const deferred = useDeferredValue(source);
  const json = JSON.stringify(toPreviewDesign(deferred, t('marketing.occasions.editor.untitled')));
  const design = useMemo(() => JSON.parse(json) as OccasionDesign, [json]);

  return (
    <Card
      variant="outlined"
      sx={{ position: { md: 'sticky' }, top: (th) => th.spacing(2), overflow: 'visible' }}
      data-testid="occasion-editor-preview"
    >
      <CardContent>
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Stack direction="row" spacing={1} sx={{ width: '100%', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 1 }}>
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
              {t('marketing.occasions.editor.previewTitle')}
            </Typography>
            <ModeToggle value={mode} onChange={setMode} pinned={pinsColorMode(design)} />
          </Stack>
          <PhonePreview look={design} mode={mode} size="md" label={t('marketing.occasions.preview.of', { vars: { name: design.name } })} />
          <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            {t('marketing.occasions.editor.previewHint')}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
