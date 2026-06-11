import type { SvgIconProps } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import TuneIcon from '@mui/icons-material/Tune';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ForumIcon from '@mui/icons-material/Forum';
import WidgetsIcon from '@mui/icons-material/Widgets';
import DescriptionIcon from '@mui/icons-material/Description';
import GavelIcon from '@mui/icons-material/Gavel';

const ICONS: Record<string, React.ComponentType<SvgIconProps>> = {
  settings: SettingsIcon,
  tune: TuneIcon,
  dashboard: DashboardIcon,
  forum: ForumIcon,
  document: DescriptionIcon,
  policy: GavelIcon,
};

/** Resolves a config icon name to an MUI icon, falling back to a neutral glyph. */
export default function AppIcon({ name, ...props }: { name: string } & SvgIconProps) {
  const Icon = ICONS[name] ?? WidgetsIcon;
  return <Icon {...props} />;
}
