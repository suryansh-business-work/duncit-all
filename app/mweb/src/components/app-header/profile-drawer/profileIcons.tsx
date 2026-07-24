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
import StorefrontIcon from '@mui/icons-material/Storefront';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
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
  shop: <StorefrontIcon />,
  orders: <LocalShippingIcon />,
  addresses: <HomeWorkIcon />,
  cart: <ShoppingCartIcon />,
  wallet: <AccountBalanceWalletIcon />,
};

export function profileIcon(key: ProfileIconKey): JSX.Element {
  return ICONS[key];
}
