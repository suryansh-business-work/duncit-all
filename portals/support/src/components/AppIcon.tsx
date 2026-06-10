import type { SvgIconProps } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import TuneIcon from '@mui/icons-material/Tune';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ForumIcon from '@mui/icons-material/Forum';
import WidgetsIcon from '@mui/icons-material/Widgets';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import StarRateIcon from '@mui/icons-material/StarRate';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';

const ICONS: Record<string, React.ComponentType<SvgIconProps>> = {
  settings: SettingsIcon,
  tune: TuneIcon,
  dashboard: DashboardIcon,
  forum: ForumIcon,
  sos: WarningAmberIcon,
  callback: PhoneCallbackIcon,
  feedback: StarRateIcon,
  ticket: ConfirmationNumberIcon,
  chat: ForumIcon,
};

/** Resolves a config icon name to an MUI icon, falling back to a neutral glyph. */
export default function AppIcon({ name, ...props }: { name: string } & SvgIconProps) {
  const Icon = ICONS[name] ?? WidgetsIcon;
  return <Icon {...props} />;
}
