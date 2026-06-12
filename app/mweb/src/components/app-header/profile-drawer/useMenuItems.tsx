import { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import HistoryIcon from '@mui/icons-material/History';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CategoryIcon from '@mui/icons-material/Category';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { useStudioMode } from '../../../StudioModeContext';
import { resolveMode } from '../../../studio-mode';

export interface MenuItem {
  label: string;
  icon: JSX.Element;
  onClick: () => void;
}

interface UseMenuItemsParams {
  roles: string[];
  onClose: () => void;
}

const sz = { fontSize: 'small' as const };

/** Menu rows for the account drawer, driven by the active studio mode. USER mode
 * keeps the full app menu (+ Earn with Duncit); each studio shows its own rows. */
export function useMenuItems({ roles, onClose }: UseMenuItemsParams) {
  const navigate = useNavigate();
  const showPodPlans = useFeatureFlag('pod_plans_section');
  const { mode } = useStudioMode();
  const effectiveMode = resolveMode(mode, roles);

  const go = (to: string) => () => {
    onClose();
    navigate(to);
  };

  const profile: MenuItem = { label: 'Profile', icon: <PersonOutlineIcon {...sz} />, onClick: go('/profile') };
  const support: MenuItem = { label: 'Support', icon: <SupportAgentIcon {...sz} />, onClick: go('/support') };
  const faqs: MenuItem = { label: 'FAQs', icon: <HelpOutlineIcon {...sz} />, onClick: go('/faqs') };
  const studio = (yourX: MenuItem, verifyTo: string): MenuItem[] => [
    profile,
    yourX,
    support,
    { label: 'Verification', icon: <VerifiedUserIcon {...sz} />, onClick: go(verifyTo) },
    faqs,
  ];

  if (effectiveMode === 'HOST') {
    return { items: studio({ label: 'Your Pods', icon: <DashboardIcon {...sz} />, onClick: go('/host/manage') }, '/become-host') };
  }
  if (effectiveMode === 'VENUE') {
    return { items: studio({ label: 'Your Venues', icon: <StorefrontIcon {...sz} />, onClick: go('/venues/manage') }, '/survey/venue') };
  }
  if (effectiveMode === 'ECOMM') {
    return { items: studio({ label: 'Your Products', icon: <Inventory2Icon {...sz} />, onClick: go('/products/manage') }, '/survey/ecomm') };
  }

  const items: MenuItem[] = [
    { label: 'Home', icon: <HomeIcon {...sz} />, onClick: go('/') },
    profile,
    { label: 'Saved Items', icon: <BookmarkBorderIcon {...sz} />, onClick: go('/saved') },
    { label: 'Pod History', icon: <HistoryIcon {...sz} />, onClick: go('/pod-history') },
    { label: 'Earn with Duncit', icon: <VolunteerActivismIcon {...sz} />, onClick: go('/earn') },
    support,
    { label: 'Pod Ideas', icon: <LightbulbIcon {...sz} />, onClick: go('/pod-ideas') },
    faqs,
  ];
  if (showPodPlans) {
    items.splice(items.length - 1, 0, { label: 'Pod Plans', icon: <CategoryIcon {...sz} />, onClick: go('/pod-plans') });
  }
  return { items };
}
