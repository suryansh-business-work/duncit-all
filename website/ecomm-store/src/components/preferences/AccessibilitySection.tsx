import { useId } from 'react';
import { Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import FormatSizeRoundedIcon from '@mui/icons-material/FormatSizeRounded';

import { useColorMode } from '../../app/providers/ColorModeProvider';
import { TEXT_SCALES, type TextScale } from '../../lib/preferences';
import { useStoreT } from '../../i18n';
import { PrefSection } from './PrefSection';
import { PrefSwitch } from './PrefSwitch';
import { TOGGLE_GROUP_SX } from './prefs.styles';

const SCALE_COPY: Record<TextScale, { labelKey: string; iconSize: string }> = {
  1: { labelKey: 'ecommStore.prefs.textDefault', iconSize: '1.1rem' },
  1.125: { labelKey: 'ecommStore.prefs.textLarge', iconSize: '1.45rem' },
  1.25: { labelKey: 'ecommStore.prefs.textLarger', iconSize: '1.8rem' },
};

const asScale = (value: unknown): TextScale | undefined => TEXT_SCALES.find((scale) => scale === value);

function TextSizeControl() {
  const { t } = useStoreT();
  const { prefs, setPrefs } = useColorMode();
  const labelId = useId();
  return (
    <Stack spacing={1}>
      <Typography id={labelId} sx={{ fontWeight: 700 }}>
        {t('ecommStore.prefs.textSize')}
      </Typography>
      <ToggleButtonGroup
        exclusive
        value={prefs.textScale}
        aria-labelledby={labelId}
        onChange={(_event, value: unknown) => {
          const textScale = asScale(value);
          if (textScale) setPrefs({ textScale });
        }}
        sx={TOGGLE_GROUP_SX}
      >
        {TEXT_SCALES.map((scale) => (
          <ToggleButton key={scale} value={scale} data-testid={`prefs-text-${scale}`}>
            <FormatSizeRoundedIcon aria-hidden sx={{ fontSize: SCALE_COPY[scale].iconSize }} />
            {t(SCALE_COPY[scale].labelKey)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}

/** Text size, underlined links, still motion, a plainer font, and the festive animation. */
export function AccessibilitySection() {
  const { t } = useStoreT();
  const { prefs, setPrefs } = useColorMode();
  return (
    <PrefSection title={t('ecommStore.prefs.accessibility')}>
      {() => (
        <>
          <TextSizeControl />
          <PrefSwitch
            label={t('ecommStore.prefs.underlineLinks')}
            hint={t('ecommStore.prefs.underlineLinksHint')}
            checked={prefs.underlineLinks}
            onChange={(underlineLinks) => setPrefs({ underlineLinks })}
          />
          <PrefSwitch
            label={t('ecommStore.prefs.reduceMotion')}
            hint={t('ecommStore.prefs.reduceMotionHint')}
            checked={prefs.reduceMotion}
            onChange={(reduceMotion) => setPrefs({ reduceMotion })}
          />
          <PrefSwitch
            label={t('ecommStore.prefs.readableFont')}
            hint={t('ecommStore.prefs.readableFontHint')}
            checked={prefs.readableFont}
            onChange={(readableFont) => setPrefs({ readableFont })}
          />
          <PrefSwitch
            label={t('ecommStore.prefs.festive')}
            hint={t('ecommStore.prefs.festiveHint')}
            checked={prefs.festiveEffects}
            onChange={(festiveEffects) => setPrefs({ festiveEffects })}
          />
        </>
      )}
    </PrefSection>
  );
}
