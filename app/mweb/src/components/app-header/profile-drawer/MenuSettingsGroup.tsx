import { Switch } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useTranslation } from '../../../i18n/useTranslation';
import MenuGroup from './MenuGroup';
import MenuRow from './MenuRow';
import PoliciesSection from './PoliciesSection';

interface Props {
  /** More than one studio is open to this account — the switch row shows. */
  canSwitch: boolean;
  /** The studio in effect, named under the switch row. */
  modeLabel: string;
  onSwitch: () => void;
  dark: boolean;
  onToggleTheme: () => void;
  publicPolicies: { id: string; slug: string; title: string }[];
  policiesLoading: boolean;
  policiesOpen: boolean;
  setPoliciesOpen: (fn: (v: boolean) => boolean) => void;
}

/** The menu's settings group — role switch, dark mode and policies in one
 * card. Native twin: components/Sidebar/SidebarSettings. */
export default function MenuSettingsGroup({
  canSwitch,
  modeLabel,
  onSwitch,
  dark,
  onToggleTheme,
  publicPolicies,
  policiesLoading,
  policiesOpen,
  setPoliciesOpen,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const showPolicies = policiesLoading || publicPolicies.length > 0;
  return (
    <MenuGroup>
      {canSwitch ? (
        <MenuRow
          key="switch"
          icon={<SwapHorizIcon />}
          label={t('mweb.common.switchRole')}
          secondary={modeLabel}
          onClick={onSwitch}
        />
      ) : null}
      <MenuRow
        key="theme"
        icon={dark ? <DarkModeIcon /> : <LightModeIcon />}
        label={t('mweb.sidebar.darkMode')}
        chevron={false}
        trailing={
          <Switch
            checked={dark}
            onChange={onToggleTheme}
            slotProps={{ input: { 'aria-label': t('mweb.sidebar.toggleDarkMode') } }}
          />
        }
      />
      {showPolicies ? (
        <PoliciesSection
          key="policies"
          loading={policiesLoading}
          publicPolicies={publicPolicies}
          policiesOpen={policiesOpen}
          setPoliciesOpen={setPoliciesOpen}
        />
      ) : null}
    </MenuGroup>
  );
}
