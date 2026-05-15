import { Box, Button, Chip, Skeleton } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';

interface Props {
  loading: boolean;
  hasData: boolean;
  selectedLocationName?: string;
  selectedZoneName?: string;
  onClick: () => void;
}

export default function HeaderLocationButton({
  loading,
  hasData,
  selectedLocationName,
  selectedZoneName,
  onClick,
}: Props) {
  if (loading && !hasData) {
    return <Skeleton variant="rounded" width={90} height={28} sx={{ borderRadius: 1 }} />;
  }
  return (
    <Button
      startIcon={<LocationOnIcon />}
      onClick={onClick}
      sx={{
        textTransform: 'none',
        color: 'text.primary',
        whiteSpace: 'nowrap',
        maxWidth: { xs: selectedZoneName ? 184 : 136, sm: 280 },
        minWidth: 0,
        overflow: 'hidden',
        minHeight: 36,
        px: 1.15,
        borderRadius: 999,
        bgcolor: 'action.hover',
        border: 1,
        borderColor: 'divider',
        fontWeight: 900,
        '& .MuiButton-startIcon': { mr: 0.5, color: 'primary.main', flex: '0 0 auto' },
        '&:hover': { bgcolor: 'action.selected' },
      }}
      size="small"
      aria-label="Change city or zone"
    >
      <Box component="span" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {selectedLocationName ?? 'Select city'}
      </Box>
      {selectedZoneName ? (
        <Chip
          size="small"
          label={selectedZoneName}
          sx={{ ml: 0.75, height: 20, maxWidth: { xs: 92, sm: 150 }, fontSize: 11, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
          color="primary"
        />
      ) : (
        <Box component="span" sx={{ display: 'none' }} />
      )}
    </Button>
  );
}
