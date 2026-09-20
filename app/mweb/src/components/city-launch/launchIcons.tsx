import type { ReactElement } from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeRounded';
import BarChartIcon from '@mui/icons-material/BarChartRounded';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonthRounded';
import CelebrationIcon from '@mui/icons-material/CelebrationRounded';
import EventIcon from '@mui/icons-material/EventRounded';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorderRounded';
import GroupsIcon from '@mui/icons-material/GroupsRounded';
import LocalCafeIcon from '@mui/icons-material/LocalCafeRounded';
import PeopleAltIcon from '@mui/icons-material/PeopleAltRounded';
import PlaceIcon from '@mui/icons-material/PlaceRounded';
import SpaIcon from '@mui/icons-material/SpaRounded';
import StorefrontIcon from '@mui/icons-material/StorefrontRounded';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUserRounded';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremiumRounded';
import type { LaunchIconKey, LaunchRoleDefinition } from '@duncit/utils';

/** The page's pictograms, named in @duncit/utils and drawn here with MUI icons.
 * `Record` so a pictogram added to the list without an icon fails tsc. */
export const LAUNCH_ICONS: Record<LaunchIconKey, ReactElement> = {
  coffee: <LocalCafeIcon />,
  people: <PeopleAltIcon />,
  event: <EventIcon />,
  cheers: <CelebrationIcon />,
  groups: <GroupsIcon />,
  shield: <VerifiedUserIcon />,
  place: <PlaceIcon />,
  calendar: <CalendarMonthIcon />,
  sparkle: <AutoAwesomeIcon />,
  heart: <FavoriteBorderIcon />,
  chart: <BarChartIcon />,
  leaf: <SpaIcon />,
};

/** The pictogram in each role's badge. */
export const LAUNCH_BADGE_ICONS: Record<LaunchRoleDefinition['section'], ReactElement> = {
  host: <GroupsIcon />,
  venue: <StorefrontIcon />,
  club_admin: <WorkspacePremiumIcon />,
};
