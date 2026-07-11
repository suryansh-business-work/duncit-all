import { JSX } from 'react';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CategoryIcon from '@mui/icons-material/Category';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import type { ProfileIconKey } from './profileSections';

const ICONS: Record<ProfileIconKey, JSX.Element> = {
  bookings: <ReceiptLongIcon />,
  saved: <BookmarkBorderIcon />,
  verification: <VerifiedUserIcon />,
  support: <SupportAgentIcon />,
  referral: <CardGiftcardIcon />,
  account: <ManageAccountsIcon />,
  earn: <VolunteerActivismIcon />,
  ideas: <LightbulbIcon />,
  plans: <CategoryIcon />,
  faqs: <HelpOutlineIcon />,
};

export function profileIcon(key: ProfileIconKey): JSX.Element {
  return ICONS[key];
}
