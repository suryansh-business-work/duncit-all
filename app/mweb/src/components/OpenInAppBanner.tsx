import { useLayoutEffect, useRef, useState } from 'react';
import { withAttribution } from '@duncit/utils';
import { gql, useQuery } from '@apollo/client';
import { useLocation } from 'react-router-dom';
import { Box, Button, IconButton, Paper, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';

const APP_VERSION_INFO = gql`
  query AppVersionInfoBanner {
    appVersionInfo {
      android_store_url
      ios_store_url
    }
  }
`;

const IOS_RX = /iphone|ipad|ipod/i;

/** Gap between the banner and whatever sits below it (bottom nav or screen edge). */
const BANNER_GAP = 12;
/** Above the bottom nav when it is mounted, above the safe area otherwise. */
const BANNER_BOTTOM = `calc(${BANNER_GAP}px + var(--duncit-bottom-nav-overlay-offset, env(safe-area-inset-bottom, 0px)))`;

/** Both actions share one height — the outlined border would otherwise make
 * "Open" 2px taller than the contained "Get app" — and split the row evenly. */
const ACTION_SX = { flex: 1, height: 44, fontWeight: 800 } as const;

const isMobileUa = () => /android/i.test(navigator.userAgent) || IOS_RX.test(navigator.userAgent);

/**
 * Mobile-only "open in app" bar: a shared mWeb link opens the installed app via
 * the duncit:// deep link (same path — native linking mirrors mWeb routes);
 * without the app the store link downloads it. Dismissal is deliberately NOT
 * persisted — it hides the bar for the current visit and comes back on the next
 * load, so the install prompt keeps reaching users who never chose the app.
 */
export default function OpenInAppBanner() {
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const mobile = isMobileUa();
  const { data } = useQuery(APP_VERSION_INFO, { skip: !mobile || dismissed, fetchPolicy: 'cache-first' });

  // Publish the space the bar occupies so overlays stacked in the same corner
  // (the floating cart) clear it instead of covering its buttons.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const node = paperRef.current;
    const clear = () => root.style.removeProperty('--duncit-app-banner-offset');
    if (!node) {
      clear();
      return undefined;
    }
    const update = () => {
      const height = Math.ceil(node.getBoundingClientRect().height);
      root.style.setProperty('--duncit-app-banner-offset', `${height + BANNER_GAP}px`);
    };
    update();
    globalThis.addEventListener('resize', update);
    return () => {
      globalThis.removeEventListener('resize', update);
      clear();
    };
  }, [mobile, dismissed]);

  if (!mobile || dismissed) return null;
  const storeUrl = IOS_RX.test(navigator.userAgent)
    ? data?.appVersionInfo?.ios_store_url
    : data?.appVersionInfo?.android_store_url;

  const dismiss = () => setDismissed(true);

  const openInApp = () => {
    // Deep-link into the installed app at the same path; a missing app is a
    // silent no-op and the user stays on mWeb. Decorated with the stored
    // attribution — location.search is empty after in-app navigation, and
    // this hop is exactly where the tags would otherwise be lost.
    globalThis.location.href = withAttribution(
      `duncit:/${location.pathname}${location.search}`,
    );
  };

  return (
    <Paper
      ref={paperRef}
      data-testid="open-in-app-banner"
      elevation={6}
      sx={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: BANNER_BOTTOM,
        zIndex: (t) => t.zIndex.snackbar,
        borderRadius: 3,
        p: 1.25,
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <InstallMobileIcon color="primary" sx={{ mt: 0.25 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" fontWeight={800}>
            Duncit is better in the app
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Open this page in the app or get it free.
          </Typography>
        </Box>
        <IconButton size="small" aria-label="Dismiss" onClick={dismiss} sx={{ mt: -0.5, mr: -0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
        <Button size="small" variant="outlined" onClick={openInApp} sx={ACTION_SX}>
          Open
        </Button>
        {storeUrl && (
          <Button
            size="small"
            variant="contained"
            href={storeUrl}
            target="_blank"
            rel="noopener"
            sx={ACTION_SX}
          >
            Get app
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
