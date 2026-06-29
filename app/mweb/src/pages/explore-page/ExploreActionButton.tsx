import { CircularProgress, IconButton, Stack, Typography } from '@mui/material';

interface Props {
  icon: React.ReactNode;
  label: string;
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
  onClick,
  active,
  loading,
  tooltip,
  onLabelClick,
}: Readonly<Props>) {
  return (
    <Stack alignItems="center" spacing={0.25}>
      <IconButton
        onClick={onClick}
        disabled={loading}
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
      </IconButton>
      <Typography
        variant="caption"
        onClick={onLabelClick}
        sx={{
          color: 'common.white',
          fontWeight: 800,
          textShadow: '0 1px 6px rgba(0,0,0,0.45)',
          cursor: onLabelClick ? 'pointer' : 'default',
        }}
      >
        {label}
      </Typography>
    </Stack>
  );
}
