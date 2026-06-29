import { Box, Card, CardActionArea, Chip, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { clubCountLabel } from '../../utils/location-tree';

interface LocationCityCardProps {
  location: any;
  active: boolean;
  popular: boolean;
  index: number;
  onSelect: () => void;
}

export default function LocationCityCard({
  location,
  active,
  popular,
  index,
  onSelect,
}: Readonly<LocationCityCardProps>) {
  const areaCount = location.location_zones?.length ?? 0;
  const fallback = index % 2 === 0
    ? 'linear-gradient(135deg, #ff7a59 0%, #e9446a 48%, #23172f 100%)'
    : 'linear-gradient(135deg, #ffb347 0%, #ef476f 46%, #2b124c 100%)';

  return (
    <Card
      elevation={0}
      sx={{
        border: 1.5,
        borderColor: active ? 'primary.main' : 'divider',
        borderRadius: 2.25,
        overflow: 'hidden',
        minWidth: 0,
        boxShadow: active ? 3 : 0,
        transition: 'border-color .15s, box-shadow .15s, transform .15s',
      }}
    >
      <CardActionArea
        onClick={onSelect}
        sx={{
          position: 'relative',
          height: 112,
          display: 'flex',
          alignItems: 'flex-end',
          p: 1,
          color: '#fff',
          backgroundImage: location.location_image
            ? `linear-gradient(180deg, rgba(9, 9, 15, 0.08), rgba(9, 9, 15, 0.78)), url(${location.location_image})`
            : fallback,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Box sx={{ position: 'absolute', top: 6, left: 6, right: 6 }}>
          {(active || popular) && (
            <Chip
              size="small"
              icon={active ? <CheckCircleIcon /> : <WhatshotIcon />}
              label={active ? 'Current' : 'Hot'}
              sx={{
                height: 20,
                fontSize: 10,
                fontWeight: 800,
                bgcolor: 'rgba(255,255,255,0.84)',
                color: active ? 'primary.main' : 'warning.dark',
                '& .MuiChip-icon': { fontSize: 13, color: 'inherit' },
              }}
            />
          )}
        </Box>
        <Box sx={{ minWidth: 0, width: '100%' }}>
          <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.1 }} noWrap>
            {location.location_name}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2, fontWeight: 700, color: '#fff' }} noWrap>
            {clubCountLabel(location.active_club_count)}
          </Typography>
          <Typography variant="caption" sx={{ lineHeight: 1.2, color: 'rgba(255,255,255,0.72)' }}>
            {areaCount ? `${areaCount} areas` : 'No areas'}
          </Typography>
        </Box>
      </CardActionArea>
    </Card>
  );
}