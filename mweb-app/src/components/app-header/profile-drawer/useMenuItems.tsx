import { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CategoryIcon from '@mui/icons-material/Category';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';

export interface MenuItem {
  label: string;
  icon: JSX.Element;
  onClick: () => void;
}

interface UseMenuItemsParams {
  roles: string[];
  onClose: () => void;
}

export function useMenuItems({ roles, onClose }: UseMenuItemsParams) {
  const navigate = useNavigate();
  const showPodPlans = useFeatureFlag('pod_plans_section');

  const isAdmin = roles.some((r) =>
    ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'].includes(r)
  );
  const isHost = roles.includes('HOST');
  const isVenue = roles.includes('VENUE_OWNER');

  const go = (to: string) => () => {
    onClose();
    navigate(to);
  };

  const baseItems: MenuItem[] = [
    { label: 'Home', icon: <HomeIcon fontSize="small" />, onClick: go('/') },
    {
      label: 'Profile',
      icon: <PersonOutlineIcon fontSize="small" />,
      onClick: go('/profile'),
    },
    {
      label: 'Saved Items',
      icon: <BookmarkBorderIcon fontSize="small" />,
      onClick: go('/saved'),
    },
  ];

  const hostItem: MenuItem = isHost
    ? {
        label: 'Hosts Management',
        icon: <DashboardIcon fontSize="small" />,
        onClick: go('/host/manage'),
      }
    : {
        label: 'Be a host',
        icon: <StorefrontIcon fontSize="small" />,
        onClick: go('/become-host'),
      };

  const venueItem: MenuItem = isVenue
    ? {
        label: 'Venue Management',
        icon: <StorefrontIcon fontSize="small" />,
        onClick: go('/venues/manage'),
      }
    : {
        label: 'Be a Venue Owner',
        icon: <AddBusinessIcon fontSize="small" />,
        onClick: go('/register-venue'),
      };

  const supportItems: MenuItem[] = [
    {
      label: 'Support',
      icon: <SupportAgentIcon fontSize="small" />,
      onClick: go('/support'),
    },
    {
      label: 'Pod Ideas',
      icon: <LightbulbIcon fontSize="small" />,
      onClick: go('/pod-ideas'),
    },
    { label: 'FAQs', icon: <HelpOutlineIcon fontSize="small" />, onClick: go('/faqs') },
  ];
  if (showPodPlans) {
    supportItems.unshift({
      label: 'Pod Plans',
      icon: <CategoryIcon fontSize="small" />,
      onClick: go('/pod-plans'),
    });
  }

  const adminItems: MenuItem[] = isAdmin
    ? [
        {
          label: 'Admin Console',
          icon: <AdminPanelSettingsIcon fontSize="small" />,
          onClick: () => window.open('/admin', '_blank'),
        },
      ]
    : [];

  return { baseItems, hostItem, venueItem, supportItems, adminItems };
}
