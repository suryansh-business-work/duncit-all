import { Box, Stack, Typography } from '@mui/material';
import ChatBubbleRoundedIcon from '@mui/icons-material/ChatBubbleRounded';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { OccasionEffects } from '@duncit/ui';
import { colorWithAlpha, hasOccasionDecoration, type OccasionDesign } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { previewPalette, type ModePalette, type PreviewMode } from './palette';

export type PhoneSize = 'sm' | 'md' | 'lg';

export interface PhonePreviewProps {
  /** The look to wear; null is the house look. */
  look: OccasionDesign | null;
  /** The viewer's mode — used unless the look pins its own. */
  mode: PreviewMode;
  size?: PhoneSize;
  /** One still frame (a gallery thumbnail) instead of the running animation. */
  still?: boolean;
  /** What the picture shows, for a screen reader. */
  label: string;
}

/** Phone width in theme spacing units. */
const WIDTH: Record<PhoneSize, number> = { sm: 20, md: 30, lg: 36 };
/** The instant a still frame shows: late enough that the first flyer is mid-screen and the garland is lit. */
const STILL_AT = 4;

/** A placeholder line of text in a card, drawn in the look's ink. */
function Line({ color, width, strong }: Readonly<{ color: string; width: string; strong?: boolean }>) {
  return <Box sx={{ height: (t) => t.spacing(strong ? 1 : 0.75), width, borderRadius: 1, bgcolor: color }} />;
}

/** A pill the size of a chip or button, in a fill and its on-colour. */
function Pill({ fill, ink, text }: Readonly<{ fill: string; ink: string; text: string }>) {
  return (
    <Box sx={{ px: 1, py: 0.25, borderRadius: 4, bgcolor: fill, color: ink, minWidth: 0 }}>
      <Typography variant="overline" noWrap sx={{ display: 'block', lineHeight: 1.6, color: 'inherit' }}>
        {text}
      </Typography>
    </Box>
  );
}

function FeedCard({ p, hero, cta, chip }: Readonly<{ p: ModePalette; hero?: boolean; cta: string; chip: string }>) {
  return (
    <Box sx={{ bgcolor: p.surface, border: 1, borderColor: p.border, borderRadius: 2, p: 1, display: 'grid', gap: 0.75 }}>
      {hero && (
        <Box
          sx={{
            height: (t) => t.spacing(7),
            borderRadius: 1.5,
            background: `linear-gradient(135deg, ${p.brand}, ${p.primary})`,
          }}
        />
      )}
      <Line color={colorWithAlpha(p.ink, 0.85)} width="80%" strong />
      <Line color={colorWithAlpha(p.muted, 0.6)} width="55%" />
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}>
        <Pill fill={p.accent} ink={p.onAccent} text={chip} />
        {hero && <Pill fill={p.primary} ink={p.onPrimary} text={cta} />}
      </Stack>
    </Box>
  );
}

/**
 * A phone wearing a look: the look's palette on a mock home screen (header in
 * primary, cards on surface, a CTA in primary/onPrimary and a chip in
 * accent/onAccent) with its decoration running over it — the same renderer
 * the apps use. Purely a picture: one accessible name, its insides hidden.
 */
export default function PhonePreview({ look, mode, size = 'md', still = false, label }: Readonly<PhonePreviewProps>) {
  const { t } = useTranslation();
  const { palette: p } = previewPalette(look, mode);
  const greeting = look?.greeting.trim() ?? '';
  const navIcon = { fontSize: 'small' as const };

  return (
    <Box
      role="img"
      aria-label={label}
      sx={{
        width: (th) => th.spacing(WIDTH[size]),
        maxWidth: '100%',
        aspectRatio: '9 / 19',
        p: 0.75,
        borderRadius: 6,
        bgcolor: 'grey.900',
        boxShadow: 8,
        flexShrink: 0,
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'relative',
          height: '100%',
          overflow: 'hidden',
          borderRadius: 5,
          bgcolor: p.bg,
          color: p.ink,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', bgcolor: p.primary, color: p.onPrimary, px: 1.25, pt: 2, pb: 1 }}>
          <Box sx={{ width: (th) => th.spacing(1.25), height: (th) => th.spacing(1.25), borderRadius: '50%', bgcolor: p.brand, border: 1, borderColor: p.onPrimary, flexShrink: 0 }} />
          <Typography variant="caption" noWrap sx={{ flex: 1, fontWeight: 700, color: 'inherit' }}>
            {look?.name ?? t('marketing.occasions.preview.appName')}
          </Typography>
          <NotificationsNoneRoundedIcon fontSize="small" />
        </Stack>
        <Stack spacing={1} sx={{ flex: 1, p: 1, minHeight: 0 }}>
          {greeting && (
            <Box sx={{ bgcolor: p.soft, borderRadius: 1.5, px: 1, py: 0.5 }}>
              <Typography variant="caption" noWrap sx={{ display: 'block', color: p.ink }}>
                {greeting}
              </Typography>
            </Box>
          )}
          <FeedCard p={p} hero cta={t('marketing.occasions.preview.join')} chip={t('marketing.occasions.preview.today')} />
          <FeedCard p={p} cta={t('marketing.occasions.preview.join')} chip={t('marketing.occasions.preview.nearby')} />
        </Stack>
        <Stack direction="row" sx={{ justifyContent: 'space-around', bgcolor: p.surface, borderTop: 1, borderColor: p.border, py: 1, color: p.muted }}>
          <HomeRoundedIcon {...navIcon} sx={{ color: p.primary }} />
          <ExploreRoundedIcon {...navIcon} />
          <ChatBubbleRoundedIcon {...navIcon} />
          <PersonRoundedIcon {...navIcon} />
        </Stack>
        {look && hasOccasionDecoration(look) && <OccasionEffects decoration={look} contained still={still} stillAt={STILL_AT} zIndex={2} />}
      </Box>
    </Box>
  );
}
