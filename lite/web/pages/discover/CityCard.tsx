import { Link as RouterLink } from 'react-router';
import { Box, Card, CardActionArea, Typography } from '@mui/material';
import type { LiteCity } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { tintAt } from '../../../shared/theme';
import { LiteImage } from '../../components/LiteImage';
import { paths } from '../../lib/paths';

interface CityCardProps {
  city: LiteCity;
  position: number;
}

/** A city tile: its picture with the name and event count over it. */
export function CityCard({ city, position }: Readonly<CityCardProps>) {
  const { t } = useWebT();
  return (
    <Card sx={{ height: '100%' }} data-testid={`city-card-${city.slug}`}>
      <CardActionArea component={RouterLink} to={paths.city(city.slug)} sx={{ height: '100%' }}>
        <Box sx={{ position: 'relative', bgcolor: tintAt(position) }}>
          {city.cover_url ? <LiteImage src={city.cover_url} alt="" width={480} height={320} /> : <Box sx={{ aspectRatio: '480 / 320' }} />}
          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.65) 100%)' }} aria-hidden />
          <Box sx={{ position: 'absolute', left: 16, right: 16, bottom: 12, color: '#fff' }}>
            <Typography variant="h4" component="h3" sx={{ color: 'inherit' }}>
              {city.name}
            </Typography>
            <Typography variant="body2" sx={{ color: 'inherit', opacity: 0.9 }}>
              {t('liteWeb.discover.eventsCount', { count: city.events_count })}
            </Typography>
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
}
