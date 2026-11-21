import { useState, type ReactNode } from 'react';
import { Box, Card, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Typography, type Theme } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

export interface ImageTileAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

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
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
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
        <DuncitIconButton
          size="small"
          aria-label={t('crm.media.actionsFor', { vars: { name: label } })}
          aria-haspopup="menu"
          aria-expanded={Boolean(anchor)}
          onClick={(e) => setAnchor(e.currentTarget)}
        >
          <MoreVertIcon fontSize="small" />
        </DuncitIconButton>
      </Stack>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {actions.map((action) => (
          <MenuItem
            key={action.key}
            disabled={action.disabled}
            onClick={() => {
              setAnchor(null);
              action.onClick();
            }}
            sx={action.destructive ? { color: 'error.main' } : undefined}
          >
            <ListItemIcon sx={action.destructive ? { color: 'error.main' } : undefined}>{action.icon}</ListItemIcon>
            <ListItemText>{action.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </Card>
  );
}
