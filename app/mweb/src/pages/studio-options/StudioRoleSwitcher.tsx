import { Box } from '@mui/material';
import { DuncitTabs, type DuncitTabItem } from '@duncit/tabs';
import { STUDIO_ROLE_LABEL_KEY, type PartnerStudioMode } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** The partner roles the account holds, in switcher order. */
  modes: readonly PartnerStudioMode[];
  /** The role whose options the Studio is listing. */
  value: PartnerStudioMode;
  onChange: (next: PartnerStudioMode) => void;
}

/**
 * The role switcher at the top of the Studio page — Host, Venue, Brand, Club
 * Admin, only the ones the account holds. Picking one swaps the options below
 * for that role's. An account with a single partner role has nothing to switch
 * between, so it gets no strip at all. Native twin:
 * components/studio-options/StudioRoleSwitcher.
 */
export default function StudioRoleSwitcher({ modes, value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  if (modes.length < 2 || !modes.includes(value)) return null;

  const items: DuncitTabItem<PartnerStudioMode>[] = modes.map((mode) => ({
    value: mode,
    label: t(STUDIO_ROLE_LABEL_KEY[mode]),
    testId: `studio-role-${mode.toLowerCase()}`,
  }));

  return (
    <Box sx={{ px: 2 }}>
      <DuncitTabs
        items={items}
        value={value}
        onChange={onChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label={t('mweb.studioOptions.roleSwitcherLabel')}
        data-testid="studio-role-switcher"
      />
    </Box>
  );
}
