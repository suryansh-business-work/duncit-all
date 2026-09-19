import type { ReactElement } from 'react';
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import CelebrationOutlinedIcon from '@mui/icons-material/CelebrationOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined';
import MusicNoteOutlinedIcon from '@mui/icons-material/MusicNoteOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import PetsOutlinedIcon from '@mui/icons-material/PetsOutlined';
import RestaurantOutlinedIcon from '@mui/icons-material/RestaurantOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import SportsSoccerOutlinedIcon from '@mui/icons-material/SportsSoccerOutlined';
import TheaterComedyOutlinedIcon from '@mui/icons-material/TheaterComedyOutlined';

/** The glyph for the icon name an admin typed on a category (`@mui/icons-material` names). */
const GLYPHS: Record<string, ReactElement> = {
  MusicNote: <MusicNoteOutlinedIcon />,
  SportsSoccer: <SportsSoccerOutlinedIcon />,
  Palette: <PaletteOutlinedIcon />,
  Restaurant: <RestaurantOutlinedIcon />,
  Code: <CodeOutlinedIcon />,
  BusinessCenter: <BusinessCenterOutlinedIcon />,
  School: <SchoolOutlinedIcon />,
  Favorite: <FavoriteBorderOutlinedIcon />,
  TheaterComedy: <TheaterComedyOutlinedIcon />,
  Pets: <PetsOutlinedIcon />,
  FitnessCenter: <FitnessCenterOutlinedIcon />,
  Celebration: <CelebrationOutlinedIcon />,
};

export function categoryIcon(name: string | null | undefined): ReactElement {
  return (name && GLYPHS[name]) || <CategoryOutlinedIcon />;
}
