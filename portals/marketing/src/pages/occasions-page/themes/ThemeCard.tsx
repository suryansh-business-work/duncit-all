import { Link as RouterLink } from 'react-router';
import { Box, Card, CardActions, CardContent, Chip, Stack, Tooltip, Typography } from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import type { OccasionTheme } from '@duncit/gql-types';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { colorWithAlpha } from '@duncit/utils';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { previewPalette, type PreviewMode } from '../preview/palette';
import PaletteSwatches from '../preview/PaletteSwatches';
import PhonePreview from '../preview/PhonePreview';
import ThemeCardMenu from './ThemeCardMenu';

export interface ThemeCardHandlers {
  onPreview: (look: OccasionTheme) => void;
  onApply: (look: OccasionTheme) => void;
  onDuplicate: (look: OccasionTheme) => void;
  onArchive: (look: OccasionTheme) => void;
  onReset: (look: OccasionTheme) => void;
  onDelete: (look: OccasionTheme) => void;
}

interface Props extends ThemeCardHandlers {
  look: OccasionTheme;
  /** The apps wear this look right now. */
  live: boolean;
  mode: PreviewMode;
}

/** One look in the gallery: a phone wearing it, what it is, and what can be done with it. */
export default function ThemeCard({ look, live, mode, onPreview, onApply, ...menu }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { palette } = previewPalette(look, mode);
  const dates = look.starts_at && look.ends_at ? { from: formatDate(look.starts_at), to: formatDate(look.ends_at) } : null;
  const editTo = `/occasions/themes/${encodeURIComponent(look.key)}`;
  const previewLabel = t('marketing.occasions.card.preview', { vars: { name: look.name } });
  const editLabel = t('marketing.occasions.card.edit', { vars: { name: look.name } });

  return (
    <Card
      variant="outlined"
      data-testid={`occasion-card-${look.key}`}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderColor: live ? 'success.main' : 'divider',
        transition: (th) => th.transitions.create(['transform', 'box-shadow', 'border-color']),
        '&:hover, &:focus-within': {
          transform: (th) => `translateY(${th.spacing(-0.25)})`,
          boxShadow: 6,
          borderColor: live ? 'success.main' : 'primary.main',
        },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover, &:focus-within': { transform: 'none' } },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: (th) => th.spacing(30),
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          pt: 3,
          background: `radial-gradient(circle at 50% 0%, ${colorWithAlpha(palette.brand, 0.35)}, ${colorWithAlpha(palette.primary, 0.08)} 70%)`,
        }}
      >
        <PhonePreview look={look} mode={mode} size="sm" still label={t('marketing.occasions.preview.of', { vars: { name: look.name } })} />
        {live && (
          <Chip size="small" color="success" label={t('marketing.occasions.card.liveNow')} sx={{ position: 'absolute', top: (th) => th.spacing(1.5), left: (th) => th.spacing(1.5), fontWeight: 700 }} />
        )}
      </Box>
      <CardContent sx={{ flex: 1, display: 'grid', gap: 1.25, alignContent: 'start' }}>
        <Box>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }} noWrap title={look.name}>
            {look.name}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {look.description}
          </Typography>
        </Box>
        <PaletteSwatches look={look} mode={mode} />
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
          {dates && (
            <Chip
              size="small"
              icon={<EventRoundedIcon />}
              color={look.schedule_enabled ? 'info' : 'default'}
              variant={look.schedule_enabled ? 'filled' : 'outlined'}
              label={t(look.schedule_enabled ? 'marketing.occasions.card.dates' : 'marketing.occasions.card.datesOff', { vars: dates })}
            />
          )}
          {look.is_builtin && <Chip size="small" variant="outlined" label={t('marketing.occasions.card.builtIn')} />}
          {look.is_archived && <Chip size="small" color="warning" variant="outlined" label={t('marketing.occasions.card.archived')} />}
        </Stack>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 0.5 }}>
        <Tooltip title={previewLabel}>
          <DuncitIconButton aria-label={previewLabel} onClick={() => onPreview(look)}>
            <VisibilityRoundedIcon />
          </DuncitIconButton>
        </Tooltip>
        <Tooltip title={editLabel}>
          <DuncitIconButton component={RouterLink} to={editTo} aria-label={editLabel}>
            <EditRoundedIcon />
          </DuncitIconButton>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        {!look.is_archived && !live && (
          <DuncitButton size="small" variant="contained" startIcon={<PublishRoundedIcon />} onClick={() => onApply(look)}>
            {t('marketing.occasions.card.applyNow')}
          </DuncitButton>
        )}
        <ThemeCardMenu
          look={look}
          onDuplicate={() => menu.onDuplicate(look)}
          onArchive={() => menu.onArchive(look)}
          onReset={() => menu.onReset(look)}
          onDelete={() => menu.onDelete(look)}
        />
      </CardActions>
    </Card>
  );
}
