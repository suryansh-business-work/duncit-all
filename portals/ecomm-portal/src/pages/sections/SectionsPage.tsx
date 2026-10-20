import { useMemo } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { useTranslation } from '@duncit/shell';
import { DuncitTabs, type DuncitTabItem } from '@duncit/tabs';
import HomePageBuilder from '../home-page/HomePageBuilder';
import HeaderFooterPanel from './HeaderFooterPanel';
import { isSectionsTab, SECTIONS_TAB_KEYS, SECTIONS_TABS, sectionsTabPath, type SectionsTab } from './sections-tabs';

/**
 * Everything on ecomm.duncit.com that used to be fixed: the Home and Deals
 * pages band by band, and the header and footer every page wears. The open tab
 * is the path (`/sections/deals`), so a reload or a shared link lands on it.
 */
export default function SectionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tab } = useParams<{ tab: string }>();
  const items = useMemo<DuncitTabItem<SectionsTab>[]>(() => SECTIONS_TABS.map((value) => ({ value, label: t(SECTIONS_TAB_KEYS[value]) })), [t]);
  if (!isSectionsTab(tab)) return <Navigate to={sectionsTabPath('home')} replace />;
  const strip = (
    <DuncitTabs
      items={items}
      value={tab}
      onChange={(next) => navigate(sectionsTabPath(next), { replace: true })}
      variant="scrollable"
      allowScrollButtonsMobile
      aria-label={t('ecommPortal.nav.sections')}
    />
  );
  if (tab === 'header-footer') return <HeaderFooterPanel tabs={strip} />;
  // Keyed by page, so switching tabs closes any open dialog and starts from that page's own list.
  return <HomePageBuilder key={tab} page={tab === 'deals' ? 'DEALS' : 'HOME'} tabs={strip} />;
}
