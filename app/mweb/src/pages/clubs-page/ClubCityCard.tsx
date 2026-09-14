import { Box, Card, CardActionArea, CardMedia, Stack, Typography } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import type { ClubCityGroup } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  group: ClubCityGroup<unknown>;
  onOpen: () => void;
}

/** 18px media corners inside the card's own 24px ones. */
const COVER_SX = { height: 120, borderRadius: '18px' } as const;

/** A city on the Clubs list: its cover, name and how many clubs operate there.
 * Opening it lists that city's clubs by locality. Native twin: home/ClubCityCard. */
export default function ClubCityCard({ group, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Card data-testid={`club-city-card-${group.locationId}`}>
      <CardActionArea onClick={onOpen} aria-label={group.city} sx={{ p: 1.5 }}>
        {group.image ? (
          <CardMedia component="img" src={group.image} alt={group.city} sx={{ ...COVER_SX, objectFit: 'cover' }} />
        ) : (
          <Box sx={{ ...COVER_SX, bgcolor: 'action.hover', color: 'secondary.main', display: 'grid', placeItems: 'center' }}>
            <LocationCityRoundedIcon sx={{ fontSize: 40 }} />
          </Box>
        )}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', pt: 1.5 }}>
          <Typography sx={{ flex: 1, fontSize: '1rem', fontWeight: 600, lineHeight: 1.2 }} noWrap>
            {group.city}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {t('mweb.clubsPage.clubCount', { count: group.clubs.length })}
          </Typography>
          <ChevronRightRoundedIcon sx={{ color: 'text.secondary' }} />
        </Stack>
      </CardActionArea>
    </Card>
  );
}
