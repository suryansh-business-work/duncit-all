import type { ReactNode } from 'react';
import { Switch } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import {
  profileMenuSections,
  profileSectionSubtitleKeys,
  type ProfileMenuFlags,
  type ProfileMenuSectionId,
} from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import { testIdProps } from '../../../utils/testIdProps';
import MenuRow from './MenuRow';
import MenuSection from './MenuSection';
import PoliciesSection from './PoliciesSection';
import { profileIcon } from './profileIcons';
import { SECTION_ICONS, menuEntry } from './profileSections';

export interface MenuSectionsProps {
  flags: ProfileMenuFlags;
  /** More than one studio is open to this account — the switch row shows. */
  canSwitch: boolean;
  /** The studio in effect, named under the switch row. */
  modeLabel: string;
  onSwitch: () => void;
  dark: boolean;
  /** A festive look pins the mode right now, so the switch has nothing to change. */
  themeLocked?: boolean;
  onToggleTheme: () => void;
  publicPolicies: { id: string; slug: string; title: string }[];
  policiesLoading: boolean;
  policiesOpen: boolean;
  setPoliciesOpen: (fn: (v: boolean) => boolean) => void;
  onNavigate: (to: string) => void;
}

/**
 * The five collapsible section cards — Explore & Community, Work & Earnings,
 * Shopping & Orders, Account & Preferences, Support & Legal. What each lists
 * (and the flag that hides a row) is the shared `profileMenuSections`; the
 * Account card adds Switch role and Dark mode, the Support card the Policies
 * list. Native twin: Sidebar/SidebarSections.
 */
export default function MenuSections({
  flags,
  canSwitch,
  modeLabel,
  onSwitch,
  dark,
  themeLocked = false,
  onToggleTheme,
  publicPolicies,
  policiesLoading,
  policiesOpen,
  setPoliciesOpen,
  onNavigate,
}: Readonly<MenuSectionsProps>) {
  const { t } = useTranslation();
  const showPolicies = policiesLoading || publicPolicies.length > 0;

  const extras: Partial<Record<ProfileMenuSectionId, { labels: string[]; rows: ReactNode[] }>> = {
    account: {
      labels: [...(canSwitch ? [t('mweb.common.switchRole')] : []), t('mweb.sidebar.darkMode')],
      rows: [
        canSwitch ? (
          <MenuRow
            key="switch"
            testId="sidebar-switch-role"
            icon={<SwapHorizIcon />}
            label={t('mweb.common.switchRole')}
            secondary={modeLabel}
            onClick={onSwitch}
          />
        ) : null,
        <MenuRow
          key="theme"
          icon={dark ? <DarkModeIcon /> : <LightModeIcon />}
          label={t('mweb.sidebar.darkMode')}
          chevron={false}
          trailing={
            <Switch
              data-testid="sidebar-theme-switch"
              checked={dark}
              disabled={themeLocked}
              onChange={onToggleTheme}
              slotProps={{
                input: { 'aria-label': t('mweb.sidebar.toggleDarkMode'), ...testIdProps('sidebar-theme-switch-input') },
              }}
            />
          }
        />,
      ],
    },
    support: {
      labels: showPolicies ? [t('mweb.common.policies')] : [],
      rows: [
        showPolicies ? (
          <PoliciesSection
            key="policies"
            loading={policiesLoading}
            publicPolicies={publicPolicies}
            policiesOpen={policiesOpen}
            setPoliciesOpen={setPoliciesOpen}
          />
        ) : null,
      ],
    },
  };

  const sections = profileMenuSections(flags, { extraRows: ['account'] }).map((section) => {
    const extra = extras[section.id];
    const subtitle = [...profileSectionSubtitleKeys(section.items).map((key) => t(key)), ...(extra?.labels ?? [])];
    return (
      <MenuSection
        key={section.id}
        id={section.id}
        icon={SECTION_ICONS[section.id]}
        title={t(section.titleKey)}
        subtitle={subtitle.join(', ')}
      >
        {section.items.map((item) => {
          const entry = menuEntry(item.key, t);
          return (
            <MenuRow
              key={entry.key}
              testId={`sidebar-item-${entry.key}`}
              icon={profileIcon(entry.icon)}
              label={entry.label}
              badge={entry.badge}
              onClick={() => onNavigate(entry.to)}
            />
          );
        })}
        {extra?.rows}
      </MenuSection>
    );
  });
  return <>{sections}</>;
}
