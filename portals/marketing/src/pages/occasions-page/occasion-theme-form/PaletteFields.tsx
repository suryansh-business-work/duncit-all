import { useState } from 'react';
import { useFormState, useWatch, type Control } from 'react-hook-form';
import { Box, Collapse, Grid, Stack } from '@mui/material';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { HOUSE_PALETTES, type PreviewMode, type TokenKey } from '../preview/palette';
import { TOKEN_LABEL } from '../preview/token-copy';
import ColorField from './ColorField';
import ContrastChip from './ContrastChip';
import type { OccasionThemeFormValues } from './occasion-theme.types';

/** The tokens that make a festival's look — always shown. */
const KEY_TOKENS: readonly TokenKey[] = ['primary', 'primaryHover', 'primaryActive', 'onPrimary', 'accent', 'onAccent', 'brand', 'bg', 'surface', 'soft'];
/** Text, edges and status colours — most looks keep the app's own. */
const MORE_TOKENS: readonly TokenKey[] = ['ink', 'muted', 'border', 'inputBorder', 'success', 'warning', 'error', 'info', 'onSemantic'];

interface Props {
  control: Control<OccasionThemeFormValues>;
  mode: PreviewMode;
}

/** One mode's colour tokens, the key ones first, with live contrast for the two label-on-fill pairs. */
export default function PaletteFields({ control, mode }: Readonly<Props>) {
  const { t } = useTranslation();
  const name = mode === 'light' ? 'palette_light' : 'palette_dark';
  const values = useWatch({ control, name });
  const { errors } = useFormState({ control, name });
  const house = HOUSE_PALETTES[mode];
  const [more, setMore] = useState(false);
  const moreHasError = MORE_TOKENS.some((key) => errors[name]?.[key]);
  const effective = (key: TokenKey) => values[key].trim() || house[key];

  const field = (key: TokenKey) => (
    <Grid key={key} size={{ xs: 12, sm: 6 }}>
      <ColorField control={control} name={`${name}.${key}`} label={t(TOKEN_LABEL[key])} placeholder={house[key]} />
    </Grid>
  );

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <ContrastChip
          pair={t('marketing.occasions.contrast.primaryPair')}
          fill={effective('primary')}
          ink={effective('onPrimary')}
        />
        <ContrastChip pair={t('marketing.occasions.contrast.accentPair')} fill={effective('accent')} ink={effective('onAccent')} />
      </Stack>
      <Grid container columnSpacing={2}>
        {KEY_TOKENS.map(field)}
      </Grid>
      <Box>
        <DuncitButton
          size="small"
          onClick={() => setMore(!more)}
          aria-expanded={more || moreHasError}
          endIcon={more || moreHasError ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
        >
          {t(more || moreHasError ? 'marketing.occasions.editor.fewerTokens' : 'marketing.occasions.editor.moreTokens')}
        </DuncitButton>
      </Box>
      {/* Opened by itself when a token in here is wrong, so the error is never hidden. */}
      <Collapse in={more || moreHasError} unmountOnExit>
        <Grid container columnSpacing={2} sx={{ pt: 1 }}>
          {MORE_TOKENS.map(field)}
        </Grid>
      </Collapse>
    </Stack>
  );
}
