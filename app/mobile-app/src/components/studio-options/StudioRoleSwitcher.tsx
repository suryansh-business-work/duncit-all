import { ScrollView } from 'react-native';
import { STUDIO_ROLE_LABEL_KEY, type PartnerStudioMode } from '@duncit/utils';

import { FilterChip } from '@/components/leaderboard/LeaderboardFilters';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** The partner roles the account holds, in switcher order. */
  modes: readonly PartnerStudioMode[];
  /** The role whose options the Studio is listing. */
  value: PartnerStudioMode;
  onChange: (next: PartnerStudioMode) => void;
}

/**
 * The role switcher at the top of the Studio screen — Host, Venue, Brand, Club
 * Admin, only the ones the account holds, as a chip row that scrolls sideways
 * on a narrow phone. Picking one swaps the options below for that role's. An
 * account with a single partner role has nothing to switch between, so it gets
 * no row at all. mWeb twin: pages/studio-options/StudioRoleSwitcher.
 */
export function StudioRoleSwitcher({ modes, value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  if (modes.length < 2 || !modes.includes(value)) return null;

  return (
    <ScrollView
      testID="studio-role-switcher"
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
      role="tablist"
      aria-label={t('mweb.studioOptions.roleSwitcherLabel')}
    >
      {modes.map((mode) => (
        <FilterChip
          key={mode}
          testID={`studio-role-${mode.toLowerCase()}`}
          label={t(STUDIO_ROLE_LABEL_KEY[mode])}
          selected={mode === value}
          onPress={() => onChange(mode)}
        />
      ))}
    </ScrollView>
  );
}
