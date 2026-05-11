import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import VisibilityIcon from '@mui/icons-material/Visibility';

interface Props {
  views: number;
  spotsTaken: number;
  spotsTotal: number;
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'primary' | 'warning';
}) {
  return (
    <Box
      sx={(theme) => ({
        flex: 1,
        minWidth: 0,
        p: 1.25,
        borderRadius: 2,
        border: `1px solid ${theme.palette[tone].main}`,
        bgcolor: alpha(theme.palette[tone].main, 0.12),
        color: theme.palette[tone].main,
      })}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        {icon}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ lineHeight: 1, fontWeight: 800 }}>
            {value}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {label}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}


export default function PodQuickStats({ views, spotsTaken, spotsTotal }: Props) {
  const remaining = spotsTotal > 0 ? Math.max(spotsTotal - spotsTaken, 0) : null;
  const viewLabel = new Intl.NumberFormat(undefined, { notation: 'compact' }).format(views || 0);

  return (
    <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
      {remaining !== null && (
        <StatCard
          tone={remaining <= 3 ? 'warning' : 'primary'}
          icon={<ConfirmationNumberIcon fontSize="small" />}
          value={String(remaining)}
          label="spots left"
        />
      )}
      <StatCard
        tone="primary"
        icon={<VisibilityIcon fontSize="small" />}
        value={viewLabel}
        label="views"
      />
    </Stack>
  );
}