import type { ReactNode } from 'react';
import {
  profileMenuSections,
  profileSectionSubtitleKeys,
  type ProfileMenuFlags,
  type ProfileMenuSectionId,
} from '@duncit/utils';

import { AppSwitch } from '@/components/AppSwitch';
import { useTranslation } from '@/hooks/useTranslation';
import type { MenuRoute } from '@/navigation/types';
import { SECTION_ICONS, menuEntry } from './profileSections';
import { SidebarPolicies } from './SidebarPolicies';
import { SidebarRow } from './SidebarRow';
import { SidebarSection } from './SidebarSection';

interface PolicyLink {
  id: string;
  slug: string;
  title: string;
}

export interface SidebarSectionsProps {
  flags: ProfileMenuFlags;
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
  onNavigate: (route: MenuRoute) => void;
}

/**
 * The five collapsible section cards — Explore & Community, Work & Earnings,
 * Shopping & Orders, Account & Preferences, Support & Legal. What each lists
 * (and the flag that hides a row) is the shared `profileMenuSections`; the
 * Account card adds Switch role and Dark mode, the Support card the Policies
 * list. mWeb twin: profile-drawer/MenuSections.
 */
export function SidebarSections({
  flags,
  canSwitch,
  modeLabel,
  onSwitch,
  dark,
  onToggleTheme,
  policies,
  policiesLoading,
  onSelectPolicy,
  onNavigate,
}: Readonly<SidebarSectionsProps>) {
  const { t } = useTranslation();
  const showPolicies = policiesLoading || policies.length > 0;

  const extras: Partial<Record<ProfileMenuSectionId, { labels: string[]; rows: ReactNode[] }>> = {
    account: {
      labels: [...(canSwitch ? [t('mweb.common.switchRole')] : []), t('mweb.sidebar.darkMode')],
      rows: [
        canSwitch ? (
          <SidebarRow
            key="switch"
            testID="sidebar-switch-role"
            icon="swap-horiz"
            label={t('mweb.common.switchRole')}
            secondary={modeLabel}
            onPress={onSwitch}
          />
        ) : null,
        <SidebarRow
          key="theme"
          icon={dark ? 'dark-mode' : 'light-mode'}
          label={t('mweb.sidebar.darkMode')}
          chevron={false}
          trailing={
            <AppSwitch
              testID="sidebar-theme-switch"
              aria-label={t('mweb.sidebar.toggleDarkMode')}
              value={dark}
              onValueChange={onToggleTheme}
            />
          }
        />,
      ],
    },
    support: {
      labels: showPolicies ? [t('mweb.common.policies')] : [],
      rows: [
        showPolicies ? (
          <SidebarPolicies
            key="policies"
            policies={policies}
            loading={policiesLoading}
            onSelect={onSelectPolicy}
          />
        ) : null,
      ],
    },
  };

  const sections = profileMenuSections(flags, { extraRows: ['account'] }).map((section) => {
    const extra = extras[section.id];
    const subtitle = [
      ...profileSectionSubtitleKeys(section.items).map((key) => t(key)),
      ...(extra?.labels ?? []),
    ];
    return (
      <SidebarSection
        key={section.id}
        id={section.id}
        icon={SECTION_ICONS[section.id]}
        title={t(section.titleKey)}
        subtitle={subtitle.join(', ')}
      >
        {section.items.map((item) => {
          const entry = menuEntry(item.key, t);
          return (
            <SidebarRow
              key={entry.key}
              testID={`sidebar-item-${entry.key}`}
              icon={entry.icon}
              label={entry.label}
              badge={entry.badge}
              onPress={() => onNavigate(entry.route)}
            />
          );
        })}
        {extra?.rows}
      </SidebarSection>
    );
  });
  return <>{sections}</>;
}
