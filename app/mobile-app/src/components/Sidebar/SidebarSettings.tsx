import { Switch } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { SidebarGroup } from './SidebarGroup';
import { SidebarPolicies } from './SidebarPolicies';
import { SidebarRow } from './SidebarRow';

interface PolicyLink {
  id: string;
  slug: string;
  title: string;
}

interface Props {
  /** More than one studio is open to this account — the switch row shows. */
  canSwitch: boolean;
  /** The studio in effect, named under the switch row. */
  modeLabel: string;
  onSwitch: () => void;
  dark: boolean;
  onToggleTheme: () => void;
  policies: PolicyLink[];
  policiesLoading: boolean;
  onSelectPolicy: (slug: string) => void;
}

/** The menu's settings group — role switch, dark mode and policies in one
 * card. RN twin of mWeb's <MenuSettingsGroup/>. */
export function SidebarSettings({
  canSwitch,
  modeLabel,
  onSwitch,
  dark,
  onToggleTheme,
  policies,
  policiesLoading,
  onSelectPolicy,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  const showPolicies = policiesLoading || policies.length > 0;
  return (
    <SidebarGroup>
      {canSwitch ? (
        <SidebarRow
          key="switch"
          testID="sidebar-switch-role"
          icon="swap-horiz"
          label={t('mweb.common.switchRole')}
          secondary={modeLabel}
          onPress={onSwitch}
        />
      ) : null}
      <SidebarRow
        key="theme"
        icon={dark ? 'dark-mode' : 'light-mode'}
        label={t('mweb.sidebar.darkMode')}
        chevron={false}
        trailing={
          <Switch
            testID="sidebar-theme-switch"
            aria-label={t('mweb.sidebar.toggleDarkMode')}
            value={dark}
            onValueChange={onToggleTheme}
            trackColor={{ true: primary }}
          />
        }
      />
      {showPolicies ? (
        <SidebarPolicies
          key="policies"
          policies={policies}
          loading={policiesLoading}
          onSelect={onSelectPolicy}
        />
      ) : null}
    </SidebarGroup>
  );
}
