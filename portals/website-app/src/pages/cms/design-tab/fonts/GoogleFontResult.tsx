import { ListItem, ListItemText, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { CmsGoogleFont } from '@duncit/gql-types';
import { fontStack } from '@duncit/brand/cms-design';
import { useGooglePreview } from './useFontPreview';

interface Props {
  font: CmsGoogleFont;
  onChoose: () => void;
}

/** One family in the catalogue, written in itself. */
export default function GoogleFontResult({ font, onChoose }: Readonly<Props>) {
  const { t } = useTranslation();
  const sample = t('websiteApp.cms.fonts.preview');
  const stack = fontStack({ family: font.family, fallback: '' });
  useGooglePreview(font.family, sample);

  return (
    <ListItem
      divider
      secondaryAction={
        <DuncitButton size="small" onClick={onChoose} aria-label={`${t('websiteApp.cms.fonts.choose')}: ${font.family}`}>
          {t('websiteApp.cms.fonts.choose')}
        </DuncitButton>
      }
    >
      <ListItemText
        primary={
          <Typography variant="h6" component="span" sx={{ fontFamily: stack }}>
            {font.family}
          </Typography>
        }
        secondary={
          <>
            <Typography component="span" sx={{ fontFamily: stack, display: 'block' }}>
              {sample}
            </Typography>
            <Typography component="span" variant="caption" color="text.secondary">
              {font.category} · {font.weights.join(', ')}
            </Typography>
          </>
        }
      />
    </ListItem>
  );
}
