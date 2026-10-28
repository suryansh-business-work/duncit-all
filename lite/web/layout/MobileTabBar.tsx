import type { ComponentType } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Box, ButtonBase, Typography, type SvgIconProps } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import { notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useWebT } from '../../shared/i18n';
import { useLiteSession } from '../../shared/session';
import { tint } from '../../shared/theme';
import { useSignInPrompt } from '../app/providers/SignInPromptProvider';
import { paths } from '../lib/paths';
import { NAV_ITEMS } from './header/nav';

/** The bar's height above the device's home indicator; the shell pads the page by the same. */
export const TAB_BAR_HEIGHT = 64;

interface Tab {
  key: string;
  label: string;
  icon: ComponentType<SvgIconProps>;
  to?: string;
  onPress?: () => void;
  active: boolean;
}

const matchOf = (to: string) => NAV_ITEMS.find((item) => item.to === to)?.match ?? ((pathname: string) => pathname === to);

const TAB_SX = {
  flex: 1,
  minWidth: 0,
  height: TAB_BAR_HEIGHT,
  flexDirection: 'column',
  gap: 0.25,
  borderRadius: 2,
  '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -4 },
} as const;

function TabButton({ tab }: Readonly<{ tab: Tab }>) {
  const Icon = tab.icon;
  const content = (
    <>
      <Box component={motion.span} animate={{ scale: tab.active ? 1.12 : 1 }} sx={{ display: 'inline-flex' }}>
        <Icon fontSize="small" aria-hidden />
      </Box>
      <Typography component="span" sx={{ fontSize: '0.7rem', fontWeight: tab.active ? 800 : 600, lineHeight: 1.2 }} noWrap>
        {tab.label}
      </Typography>
    </>
  );
  const color = tab.active ? 'text.primary' : 'text.secondary';
  return tab.to ? (
    <ButtonBase component={RouterLink} to={tab.to} aria-current={tab.active ? 'page' : undefined} sx={{ ...TAB_SX, color }} data-testid={`tab-${tab.key}`}>
      {content}
    </ButtonBase>
  ) : (
    <ButtonBase onClick={tab.onPress} sx={{ ...TAB_SX, color }} data-testid={`tab-${tab.key}`}>
      {content}
    </ButtonBase>
  );
}

/**
 * On a phone the web app moves like a native one: a bottom tab bar with the
 * places a thumb reaches for and a raised Create in the middle, above the
 * device's home indicator. Hidden from a small tablet up, where the header nav
 * does the job.
 */
export function MobileTabBar() {
  const { t } = useWebT();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signedIn } = useLiteSession();
  const { requireSignIn, openSignIn } = useSignInPrompt();
  const create = () => {
    requireSignIn()
      .then((ok) => (ok ? navigate(paths.create) : undefined))
      .catch((error: unknown) => notifyError(parseApiError(error)));
  };
  const tab = (key: string, labelKey: string, icon: Tab['icon'], to: string): Tab => ({ key, label: t(labelKey), icon, to, active: matchOf(to)(pathname) });
  const [left, right]: Tab[][] = signedIn
    ? [
        [tab('discover', 'liteWeb.nav.discover', ExploreOutlinedIcon, paths.discover), tab('events', 'liteWeb.nav.events', ConfirmationNumberOutlinedIcon, paths.events)],
        [tab('calendars', 'liteWeb.nav.calendars', CalendarMonthOutlinedIcon, paths.calendars), tab('profile', 'liteWeb.nav.tabProfile', AccountCircleOutlinedIcon, paths.settings())],
      ]
    : [
        [tab('home', 'liteWeb.nav.tabHome', HomeOutlinedIcon, paths.home), tab('discover', 'liteWeb.nav.discover', ExploreOutlinedIcon, paths.discover)],
        [tab('pricing', 'liteWeb.nav.pricing', SellOutlinedIcon, paths.pricing), { key: 'signin', label: t('lite.common.signIn'), icon: LoginOutlinedIcon, onPress: openSignIn, active: false }],
      ];
  return (
    <Box
      component="nav"
      aria-label={t('liteWeb.nav.tabBar')}
      data-testid="mobile-tab-bar"
      sx={(theme: Theme) => ({
        display: 'none',
        [theme.breakpoints.down('sm')]: { display: 'flex' },
        position: 'fixed',
        insetInline: 0,
        bottom: 0,
        zIndex: theme.zIndex.appBar,
        alignItems: 'center',
        px: 1,
        pb: 'env(safe-area-inset-bottom)',
        borderTop: 1,
        borderColor: 'divider',
        backdropFilter: 'saturate(140%) blur(14px)',
        backgroundColor: `rgba(${theme.vars?.palette.background.defaultChannel} / 0.86)`,
      })}
    >
      {left.map((item) => (
        <TabButton key={item.key} tab={item} />
      ))}
      <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
        <ButtonBase
          component={motion.button}
          whileTap={{ scale: 0.92 }}
          onClick={create}
          aria-label={t('liteWeb.nav.create')}
          data-testid="tab-create"
          sx={(theme: Theme) => ({
            width: 52,
            height: 52,
            mt: -2.5,
            borderRadius: '50%',
            color: 'primary.contrastText',
            bgcolor: 'primary.main',
            boxShadow: `0 10px 24px ${tint(theme.palette.primary.main, 0.45)}`,
            '&.Mui-focusVisible': { outline: '3px solid', outlineColor: 'text.primary', outlineOffset: 2 },
          })}
        >
          <AddIcon />
        </ButtonBase>
      </Box>
      {right.map((item) => (
        <TabButton key={item.key} tab={item} />
      ))}
    </Box>
  );
}
