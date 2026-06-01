import type { SvgIconProps } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import TuneIcon from '@mui/icons-material/Tune';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ForumIcon from '@mui/icons-material/Forum';
import FlagIcon from '@mui/icons-material/Flag';
import LockIcon from '@mui/icons-material/Lock';
import ConstructionIcon from '@mui/icons-material/Construction';
import HubIcon from '@mui/icons-material/Hub';
import WidgetsIcon from '@mui/icons-material/Widgets';

const ICONS: Record<string, React.ComponentType<SvgIconProps>> = {
  settings: SettingsIcon,
  tune: TuneIcon,
  dashboard: DashboardIcon,
  forum: ForumIcon,
  flag: FlagIcon,
  lock: LockIcon,
  construction: ConstructionIcon,
  hub: HubIcon,
};

/** Resolves a config icon name to an MUI icon, falling back to a neutral glyph. */
export default function AppIcon({ name, ...props }: { name: string } & SvgIconProps) {
  const Icon = ICONS[name] ?? WidgetsIcon;
  return <Icon {...props} />;
}
