import { Box } from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import EmojiPeopleIcon from '@mui/icons-material/EmojiPeople';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import PetsIcon from '@mui/icons-material/Pets';
import PetsOutlinedIcon from '@mui/icons-material/PetsOutlined';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import ParkIcon from '@mui/icons-material/Park';
import type { SvgIconComponent } from '@mui/icons-material';

const isImageIcon = (value: string | null | undefined) => {
  const next = (value ?? '').trim();
  return /^data:image\//i.test(next) || /^https?:\/\//i.test(next) || next.startsWith('/');
};

const MUI_ICON_MAP: Record<string, SvgIconComponent> = {
  PeopleAlt: PeopleAltIcon,
  EmojiPeople: EmojiPeopleIcon,
  Person: PersonIcon,
  Group: GroupsIcon,
  Groups: GroupsIcon,
  Pets: PetsIcon,
  PetsOutlined: PetsOutlinedIcon,
  Favorite: FavoriteIcon,
  FitnessCenter: FitnessCenterIcon,
  SportsSoccer: SportsSoccerIcon,
  Restaurant: RestaurantIcon,
  Park: ParkIcon,
};

export function renderSuperCategoryMark(icon: string | null | undefined) {
  const next = (icon ?? '').trim();
  if (!next) return null;
  if (isImageIcon(next)) {
    return (
      <Box
        component="img"
        src={next}
        alt=""
        sx={{ width: 18, height: 18, objectFit: 'cover', borderRadius: 0.75, flex: '0 0 auto' }}
      />
    );
  }
  const MuiIcon = MUI_ICON_MAP[next];
  if (MuiIcon) return <MuiIcon sx={{ fontSize: 18, flex: '0 0 auto' }} />;
  return next.length <= 2 ? (
    <Box component="span" sx={{ lineHeight: 1, flex: '0 0 auto' }}>
      {next}
    </Box>
  ) : null;
}
