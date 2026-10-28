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
import { useMuiIcons } from '@duncit/ui';
import { liteLog } from '../../../shared/log';

/** The usual category glyphs, drawn at once (and in the server render) without the full icon set. */
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

const reportIconListLoad = (error: unknown) => liteLog.error('discover', 'categoryIcon', { error });

/**
 * Any other icon the console's picker offers, from the lazily loaded MUI set:
 * its outlined form when MUI has one (Lite's look), else the exact export. The
 * generic glyph shows meanwhile, and for a name that is no MUI icon.
 */
function NamedGlyph({ name }: Readonly<{ name: string }>) {
  const { find } = useMuiIcons(reportIconListLoad);
  const Icon = find(`${name}Outlined`) ?? find(name) ?? CategoryOutlinedIcon;
  return <Icon />;
}

/** The glyph for the `@mui/icons-material` name an admin picked on a category. */
export function categoryIcon(name: string | null | undefined): ReactElement {
  if (!name) return <CategoryOutlinedIcon />;
  return GLYPHS[name] ?? <NamedGlyph name={name} />;
}
