import { CircularProgress, Stack, Typography } from '@mui/material';
import { DuncitIconButton } from '@duncit/buttons';

interface Props {
  icon: React.ReactNode;
  label: string;
  /** The button's accessible name; the visible label under it is often a count. */
  ariaLabel?: string;
  onClick: () => void;
  active?: boolean;
  loading?: boolean;
  tooltip?: string;
  /** Optional separate tap on the count/label (e.g. like count → who-liked list). */
  onLabelClick?: () => void;
}

export default function ExploreActionButton({
  icon,
  label,
  ariaLabel,
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
        sx={{
          width: 42,
          height: 42,
          bgcolor: active ? 'rgba(255,79,115,0.86)' : 'rgba(0,0,0,0.34)',
          color: active ? 'primary.light' : 'common.white',
          backdropFilter: 'blur(10px)',
          '&:hover': { bgcolor: active ? 'rgba(255,79,115,0.94)' : 'rgba(0,0,0,0.5)' },
        }}
      >
        {loading ? <CircularProgress size={19} color="inherit" /> : icon}
      </DuncitIconButton>
      <Typography
        variant="caption"
        onClick={onLabelClick}
        sx={{
          color: 'common.white',
          fontWeight: 600,
          textShadow: '0 1px 6px rgba(0,0,0,0.45)',
          cursor: onLabelClick ? 'pointer' : 'default',
        }}
      >
        {label}
      </Typography>
    </Stack>
  );
}
