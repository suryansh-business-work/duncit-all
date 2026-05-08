import { Avatar, Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ResponsiveDialog from '../ResponsiveDialog';

const CONDITION_LABEL: Record<string, string> = {
  POD_JOIN_COUNT: 'Pods joined',
  POD_HOST_COUNT: 'Pods hosted',
  CLUB_JOIN_COUNT: 'Clubs joined',
  POD_REFERRAL_COUNT: 'Successful referrals',
  MANUAL: 'Awarded by admin',
};

interface Badge {
  id?: string;
  title?: string;
  description?: string;
  image_url?: string;
  condition_type?: string;
  threshold?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  badge?: Badge | null;
  awardedAt?: string;
  awardedReason?: string;
}

function parseProgress(reason?: string): { current: number; total: number } | null {
  if (!reason) return null;
  const m = /(\d+)\s*\/\s*(\d+)/.exec(reason);
  if (!m) return null;
  return { current: Number(m[1]), total: Number(m[2]) };
}

export default function BadgeDetailsSheet({
  open,
  onClose,
  badge,
  awardedAt,
  awardedReason,
}: Props) {
  if (!badge) return null;
  const conditionLabel =
    CONDITION_LABEL[badge.condition_type ?? ''] ?? badge.condition_type ?? '';
  const progress = parseProgress(awardedReason);
  const pct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : null;

  return (
    <ResponsiveDialog open={open} onClose={onClose} bottomSheetOnly title="Badge details">
      <Stack spacing={2} sx={{ pb: 1 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            src={badge.image_url || undefined}
            sx={{ width: 72, height: 72, bgcolor: 'primary.light' }}
          >
            {!badge.image_url && <EmojiEventsIcon fontSize="large" />}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6" fontWeight={700} noWrap>
              {badge.title || 'Badge'}
            </Typography>
            {conditionLabel && (
              <Chip
                size="small"
                label={
                  badge.threshold
                    ? `${conditionLabel} · ≥ ${badge.threshold}`
                    : conditionLabel
                }
                sx={{ mt: 0.5 }}
              />
            )}
          </Box>
        </Stack>

        {badge.description && (
          <Box>
            <Typography variant="overline" color="text.secondary">
              About this badge
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {badge.description}
            </Typography>
          </Box>
        )}

        {progress && (
          <Box>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="caption" fontWeight={600}>
                {progress.current} / {progress.total}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={pct ?? 100}
              sx={{ borderRadius: 1, height: 8, mt: 0.5 }}
            />
          </Box>
        )}

        {awardedAt && (
          <Typography variant="caption" color="text.secondary">
            Earned on {new Date(awardedAt).toLocaleDateString()}
          </Typography>
        )}
      </Stack>
    </ResponsiveDialog>
  );
}
