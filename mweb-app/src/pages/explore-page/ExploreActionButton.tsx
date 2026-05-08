import { IconButton, Stack, Typography } from '@mui/material';

interface Props {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  tooltip?: string;
}

export default function ExploreActionButton({ icon, label, onClick, active, tooltip }: Props) {
  return (
    <Stack alignItems="center" spacing={0.25}>
      <IconButton
        onClick={onClick}
        title={tooltip}
        sx={{
          bgcolor: 'rgba(255,255,255,0.15)',
          color: active ? 'primary.light' : 'common.white',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
        }}
      >
        {icon}
      </IconButton>
      <Typography variant="caption" sx={{ color: 'common.white' }}>
        {label}
      </Typography>
    </Stack>
  );
}
