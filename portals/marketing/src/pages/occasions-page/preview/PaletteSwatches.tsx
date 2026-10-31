import { Box, Stack, Tooltip } from '@mui/material';
import type { OccasionDesign } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { previewPalette, type PreviewMode, type TokenKey } from './palette';
import { TOKEN_LABEL } from './token-copy';

/** The tokens that carry a look's character, shown as dots on its card. */
const SHOWN: readonly TokenKey[] = ['primary', 'accent', 'brand', 'bg', 'surface', 'soft'];

/** A look's key colours as a row of dots, each naming its token on hover. */
export default function PaletteSwatches({ look, mode }: Readonly<{ look: OccasionDesign; mode: PreviewMode }>) {
  const { t } = useTranslation();
  const { palette } = previewPalette(look, mode);

  return (
    <Stack direction="row" spacing={0.5} role="list" aria-label={t('marketing.occasions.card.palette')}>
      {SHOWN.map((key) => (
        <Tooltip key={key} title={`${t(TOKEN_LABEL[key])} ${palette[key]}`}>
          <Box
            role="listitem"
            aria-label={`${t(TOKEN_LABEL[key])} ${palette[key]}`}
            sx={{
              width: (th) => th.spacing(2.25),
              height: (th) => th.spacing(2.25),
              borderRadius: '50%',
              bgcolor: palette[key],
              border: 1,
              borderColor: 'divider',
              boxShadow: 1,
            }}
          />
        </Tooltip>
      ))}
    </Stack>
  );
}
