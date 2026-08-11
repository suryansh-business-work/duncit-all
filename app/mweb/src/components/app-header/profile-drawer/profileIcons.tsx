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
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ExploreIcon from '@mui/icons-material/Explore';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StoreIcon from '@mui/icons-material/Store';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import InsightsIcon from '@mui/icons-material/Insights';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
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
  tour: <ExploreIcon />,
  shop: <StorefrontIcon />,
  orders: <LocalShippingIcon />,
  addresses: <HomeWorkIcon />,
  cart: <ShoppingCartIcon />,
  wallet: <AccountBalanceWalletIcon />,
  coin: <MonetizationOnIcon />,
  leaderboard: <EmojiEventsIcon />,
  // The partner menus reuse the Earn cards' icon vocabulary, so a role reads
  // the same on the card that unlocked it and in its own drawer section.
  host: <DashboardIcon />,
  venue: <StoreIcon />,
  ecomm: <Inventory2Icon />,
  insights: <InsightsIcon />,
  // A slot request is a booking waiting on a decision, so it wears a calendar
  // rather than the venue's own storefront icon.
  calendar: <EventAvailableIcon />,
};

export function profileIcon(key: ProfileIconKey): JSX.Element {
  return ICONS[key];
}
