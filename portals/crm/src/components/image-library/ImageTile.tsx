import type { ReactNode } from 'react';
import { Box, Card, Stack, Typography, type Theme } from '@mui/material';
import { ActionsMenu, type ActionsMenuItem } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';

/** One action in a tile's menu (the shared `ActionsMenuItem`). */
export type ImageTileAction = ActionsMenuItem;

interface Props {
  url: string;
  name: string;
  /** One line under the name: type · dimensions · size. */
  meta?: string;
  /** `contain` keeps a logo whole on a checkerboard; `cover` fills the frame with a photo. */
  fit: 'contain' | 'cover';
  /** A chip over the image's corner (e.g. "Email logo"). */
  badge?: ReactNode;
  onPreview: () => void;
  actions: ImageTileAction[];
}

/** A checkerboard so a transparent logo's edges show, drawn in the theme's divider colour. */
const checkerboard = (theme: Theme) => ({
  backgroundColor: theme.palette.action.hover,
  backgroundImage: `linear-gradient(45deg, ${theme.palette.divider} 25%, transparent 25%), linear-gradient(-45deg, ${theme.palette.divider} 25%, transparent 25%)`,
  backgroundSize: '16px 16px',
});

/** One uploaded image as a card: a clickable preview, its name and details, and an actions menu. */
export default function ImageTile({ url, name, meta, fit, badge, onPreview, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const label = name || t('crm.media.untitled');

  return (
    <Card variant="outlined" sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <Box sx={{ position: 'relative' }}>
        <Box
          component="button"
          type="button"
          onClick={onPreview}
          aria-label={t('crm.media.previewNamed', { vars: { name: label } })}
          sx={(theme) => ({
            display: 'block',
            width: '100%',
            aspectRatio: '4 / 3',
            p: fit === 'contain' ? 1.5 : 0,
            border: 0,
            cursor: 'zoom-in',
            ...(fit === 'contain' ? checkerboard(theme) : { backgroundColor: theme.palette.action.hover }),
            '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 },
          })}
        >
          <Box
            component="img"
            src={url}
            alt={label}
            loading="lazy"
            sx={{ width: '100%', height: '100%', objectFit: fit, display: 'block' }}
          />
        </Box>
        {badge && <Box sx={{ position: 'absolute', top: 8, left: 8 }}>{badge}</Box>}
      </Box>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', p: 1, pl: 1.5 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography component="p" variant="body2" noWrap title={label} sx={{ fontWeight: 700 }}>
            {label}
          </Typography>
          {meta && (
            <Typography component="p" variant="caption" noWrap sx={{ color: 'text.secondary' }}>
              {meta}
            </Typography>
          )}
        </Box>
        <ActionsMenu buttonLabel={t('crm.media.actionsFor', { vars: { name: label } })} actions={actions} />
      </Stack>
    </Card>
  );
}
