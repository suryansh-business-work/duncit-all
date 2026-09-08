import GridOnIcon from '@mui/icons-material/GridOn';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CampaignIcon from '@mui/icons-material/CampaignOutlined';
import { DuncitTabs, useTabParam, type DuncitTabItem, type DuncitTabsState } from '@duncit/tabs';
import { useTranslation } from '../../i18n/useTranslation';
import type { Translate } from '../../i18n/fallback';

export type ProfileTab = 'posts' | 'joined' | 'hosted';

interface Props {
  tabs: DuncitTabsState<ProfileTab>;
}

const tabItems = (t: Translate, isHost: boolean, isOwner: boolean): DuncitTabItem<ProfileTab>[] => {
  const items: DuncitTabItem<ProfileTab>[] = [
    { value: 'posts', label: t('mweb.profile.tabPosts'), icon: <GridOnIcon fontSize="small" />, iconPosition: 'start', testId: 'profile-tab-posts' },
    { value: 'joined', label: t('mweb.podHistory.joinedPods'), icon: <EventAvailableIcon fontSize="small" />, iconPosition: 'start', testId: 'profile-tab-joined' },
  ];
  if (isHost) {
    items.push({
      value: 'hosted',
      label: isOwner ? t('mweb.profile.tabMyPods') : t('mweb.profile.tabTheirPods'),
      icon: <CampaignIcon fontSize="small" />,
      iconPosition: 'start',
      testId: 'profile-tab-hosted',
    });
  }
  return items;
};

/**
 * The strip over a profile's content: Posts, Joined Pods and — for a host —
 * the pods they run. Selection lives in the URL (`?selectedtab=`) like every
 * other tab strip. The page owns the state (`useProfileTabs`) so it can render
 * the matching panel; `isHost` decides whether the third tab exists and
 * `isOwner` whether it reads "My Pods" or "Their Pods".
 * Twin of native `ProfileTabs` (rule 27).
 */
export function useProfileTabs(isHost: boolean, isOwner: boolean) {
  const { t } = useTranslation();
  return useTabParam<ProfileTab>({ items: tabItems(t, isHost, isOwner), fallback: 'posts' });
}

export default function ProfileTabs({ tabs }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <DuncitTabs
      {...tabs}
      variant="fullWidth"
      aria-label={t('mweb.profile.profileSections')}
      sx={{ minHeight: 44, '& .MuiTab-root': { fontWeight: 700, minHeight: 44, letterSpacing: 0.5 } }}
    />
  );
}
