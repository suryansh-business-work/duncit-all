import { Card, CardActionArea, Chip, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import { showsWaitlist } from '@duncit/utils';
import { clubCountLabel } from '../../utils/location-tree';
import { useTranslation } from '../../i18n/useTranslation';

/** Dark scrim over the city photo so its name reads in either theme. */
const PHOTO_SCRIM = 'linear-gradient(180deg, rgba(9, 9, 15, 0.08), rgba(9, 9, 15, 0.78))';

/** The badge above a not-yet-launched city's name: in the tile's flow rather
 * than a corner, so it has the whole width and never runs under the check. */
const COMING_SOON_SX = {
  height: 20,
  maxWidth: '100%',
  mb: 0.75,
  fontSize: 11,
  fontWeight: 600,
  '& .MuiChip-label': { px: 1 },
} as const;

interface LocationCityCardProps {
  location: any;
  active: boolean;
  onSelect: () => void;
}

/** A city tile: the city's photo under a scrim (or a surface tile with a
 * coral city glyph when it has none), the name and its club count; the chosen
 * one is ringed green with a check. A city that has not launched yet counts
 * the people waiting for it instead and carries a Coming soon badge. Native
 * twin: LocationDialog/CityList. */
export default function LocationCityCard({ location, active, onSelect }: Readonly<LocationCityCardProps>) {
  const { t } = useTranslation();
  const photo: string | undefined = location.location_image || undefined;
  const ink = photo ? 'common.white' : 'text.primary';
  const backgroundImage = photo ? `${PHOTO_SCRIM}, url(${photo})` : 'none';
  const waitlist = showsWaitlist(location);
  const caption = waitlist
    ? t('mweb.cityLaunch.peopleIn', { count: location.subscriber_count ?? 0 })
    : clubCountLabel(location.active_club_count);

  const cardTestId = `location-${location.id}`;
  return (
    <Card
      data-testid={cardTestId}
      elevation={0}
      sx={{
        borderRadius: '18px',
        border: '2px solid',
        borderColor: active ? 'primary.main' : 'transparent',
        boxShadow: 'none',
        bgcolor: 'background.paper',
        overflow: 'hidden',
        minWidth: 0,
        transition: 'border-color .15s',
      }}
    >
      <CardActionArea
        data-testid={`${cardTestId}-select`}
        aria-pressed={active}
        onClick={onSelect}
        sx={{
          position: 'relative',
          height: 120,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          p: 1.25,
          color: ink,
          backgroundImage,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {photo ? null : (
          <LocationCityIcon
            sx={{ position: 'absolute', top: 10, left: 10, fontSize: 24, color: 'secondary.main' }}
          />
        )}
        {active && (
          <CheckCircleIcon
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              fontSize: 20,
              color: 'primary.main',
              bgcolor: 'background.paper',
              borderRadius: '50%',
            }}
          />
        )}
        {waitlist && (
          <Chip
            data-testid="city-tile-coming-soon"
            size="small"
            color="primary"
            label={t('mweb.cityLaunch.comingSoon')}
            sx={COMING_SOON_SX}
          />
        )}
        <Typography noWrap sx={{ width: '100%', fontSize: 14, fontWeight: 600, lineHeight: 1.25 }}>
          {location.location_name}
        </Typography>
        <Typography
          data-testid={waitlist ? 'city-tile-people-in' : undefined}
          noWrap
          sx={{ width: '100%', fontSize: 12, fontWeight: 500, lineHeight: 1.3, opacity: 0.9 }}
        >
          {caption}
        </Typography>
      </CardActionArea>
    </Card>
  );
}
