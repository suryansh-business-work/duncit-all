import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import AppsIcon from '@mui/icons-material/Apps';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { StudioOptionsEntry } from '@duncit/utils';
import { SURFACE_SX } from '../../../theme';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  entry: StudioOptionsEntry;
  onNavigate: (to: string) => void;
}

/**
 * The ONE studio row the drawer shows once switched into a studio — "Venue
 * Options", "Host Options", … — a primary-tinted featured card (the Refer &
 * Earn card's shape) that opens the studio's Options page, where every option
 * is listed with its hint.
 */
export default function StudioOptionsCard({ entry, onNavigate }: Readonly<Props>) {
  const { t } = useTranslation();
  const title = t(entry.labelKey);
  const open = () => onNavigate(entry.path);

  return (
    <Box sx={{ px: 2, pb: 1.5 }}>
      <Stack
        data-testid="sidebar-studio-options"
        direction="row"
        spacing={1.5}
        onClick={open}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        }}
        aria-label={title}
        aria-describedby="sidebar-studio-options-hint"
        sx={{
          ...SURFACE_SX,
          p: 2,
          alignItems: 'center',
          cursor: 'pointer',
          borderColor: 'primary.main',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
          transition: 'background-color 160ms ease',
          '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.18) },
          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color: 'primary.contrastText',
            bgcolor: 'primary.main',
            flexShrink: 0,
          }}
        >
          <AppsIcon />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap sx={{ fontSize: 15, fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography id="sidebar-studio-options-hint" noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t(entry.hintKey)}
          </Typography>
        </Box>
        <ChevronRightIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
      </Stack>
    </Box>
  );
}
