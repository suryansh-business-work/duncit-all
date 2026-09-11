import { CircularProgress, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { DuncitIconButton } from '@duncit/buttons';

interface Props {
  icon: React.ReactNode;
  label: string;
  /** The button's accessible name; the visible label under it is often a count. */
  ariaLabel?: string;
  /** Count shown under the disc (join spots, likes, comments). Label-only
   * actions (save, share, open) carry no caption — the icon says it. */
  caption?: string;
  onClick: () => void;
  active?: boolean;
  loading?: boolean;
  tooltip?: string;
  /** Optional separate tap on the count/label (e.g. like count → who-liked list). */
  onLabelClick?: () => void;
}

export default function ExploreActionButton({
  icon,
  ariaLabel,
  caption,
  onClick,
  active,
  loading,
  tooltip,
  onLabelClick,
}: Readonly<Props>) {
  return (
    <Stack spacing={0.25} sx={{
      alignItems: "center"
    }}>
      <DuncitIconButton
        onClick={onClick}
        disabled={loading}
        aria-label={ariaLabel}
        title={tooltip}
        sx={(theme) => ({
          width: 44,
          height: 44,
          minHeight: 44,
          bgcolor: active ? 'secondary.main' : alpha(theme.palette.common.black, 0.4),
          color: 'common.white',
          backdropFilter: 'blur(10px)',
          '&:hover': { bgcolor: active ? 'secondary.main' : alpha(theme.palette.common.black, 0.55) },
        })}
      >
        {loading ? <CircularProgress size={19} color="inherit" /> : icon}
      </DuncitIconButton>
      {caption ? (
        <Typography
          variant="caption"
          onClick={onLabelClick}
          sx={(theme) => ({
            color: 'common.white',
            fontWeight: 600,
            fontSize: '0.6875rem',
            textShadow: `0 1px 6px ${alpha(theme.palette.common.black, 0.45)}`,
            cursor: onLabelClick ? 'pointer' : 'default',
          })}
        >
          {caption}
        </Typography>
      ) : null}
    </Stack>
  );
}
