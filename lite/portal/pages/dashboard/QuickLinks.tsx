import { Link as RouterLink } from 'react-router';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { SectionCard } from '@duncit/ui';
import { usePortalT } from '../../../shared/i18n';
import { NAV_ITEMS } from '../../layout/nav-items';
import { QUICK_LINK_PATHS } from './stat-tiles';

/** The most-opened pages, repeated under the tiles so the dashboard is a real front door. */
export function QuickLinks() {
  const { t } = usePortalT();
  const links = NAV_ITEMS.filter((item) => QUICK_LINK_PATHS.has(item.path));
  return (
    <SectionCard title={t('litePortal.dashboard.quickLinks')} subtitle={t('litePortal.dashboard.quickLinksHint')}>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <DuncitButton key={item.path} component={RouterLink} to={item.path} variant="outlined" startIcon={<Icon />} data-testid={`quick-link${item.path.replaceAll('/', '-')}`}>
              {t(item.labelKey)}
            </DuncitButton>
          );
        })}
      </Stack>
    </SectionCard>
  );
}
