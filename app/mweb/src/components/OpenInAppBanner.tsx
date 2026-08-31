import { useLayoutEffect, useRef, useState } from 'react';
import { withAttribution } from '@duncit/utils';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from '../i18n/useTranslation';
import { Box, Paper, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';

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
const ACTION_SX = { flex: 1, height: 44, fontWeight: 600 } as const;

const isMobileUa = () => /android/i.test(navigator.userAgent) || IOS_RX.test(navigator.userAgent);

/**
 * The Android package id, out of the Play listing the admin already configures.
 *
 * Read from the store URL rather than written down here: the URL is
 * `…/details?id=<package>` by construction, so the one value an admin edits
 * stays the only place it lives.
 */
function packageFromStoreUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).searchParams.get('id');
  } catch {
    return null;
  }
}

/**
 * Mobile-only "open in app" bar: a shared mWeb link opens the installed app via
 * the duncit:// deep link (same path — native linking mirrors mWeb routes);
 * without the app the store link downloads it. Dismissal is deliberately NOT
 * persisted — it hides the bar for the current visit and comes back on the next
 * load, so the install prompt keeps reaching users who never chose the app.
 */
export default function OpenInAppBanner() {
  const { t } = useTranslation();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const mobile = isMobileUa();
  const { data } = useQuery<any>(APP_VERSION_INFO, { skip: !mobile || dismissed, fetchPolicy: 'cache-first' });

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
    /*
      Same path, in the app.

      Decorated with the stored attribution — location.search is empty after
      in-app navigation, and this hop is exactly where the tags would
      otherwise be lost.

      Android goes through an intent: URL rather than the duncit: scheme. Both
      open the app, but a plain scheme that nothing handles leaves Chrome on
      an error page, while an intent carries the address to fall back to and
      Chrome simply stays put. It also works before Android has finished
      verifying the App Link, which can take a day after an install.
    */
    const target = withAttribution(
      `${globalThis.location.origin}${location.pathname}${location.search}`,
    );
    const deepLink = withAttribution(`duncit:/${location.pathname}${location.search}`);

    if (IOS_RX.test(navigator.userAgent)) {
      globalThis.location.href = deepLink;
      return;
    }
    const androidPackage = packageFromStoreUrl(storeUrl);
    if (!androidPackage) {
      globalThis.location.href = deepLink;
      return;
    }
    const withoutScheme = target.replace(/^https?:\/\//, '');
    const fallback = encodeURIComponent(storeUrl ?? target);
    globalThis.location.href = `intent://${withoutScheme}#Intent;scheme=https;package=${androidPackage};S.browser_fallback_url=${fallback};end`;
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
        borderRadius: '16px',
        p: 1.25,
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{
        alignItems: "flex-start"
      }}>
        <InstallMobileIcon color="primary" sx={{ mt: 0.25 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{
            fontWeight: 600
          }}>
            {t('mweb.openInApp.title')}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: "block"
            }}>
            {t('mweb.openInApp.subtitle')}
          </Typography>
        </Box>
        <DuncitIconButton size="small" aria-label={t('mweb.openInApp.dismiss')} onClick={dismiss} sx={{ mt: -0.5, mr: -0.5 }}>
          <CloseIcon fontSize="small" />
        </DuncitIconButton>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
        <DuncitButton size="small" variant="outlined" onClick={openInApp} sx={ACTION_SX}>
          {t('mweb.openInApp.open')}
        </DuncitButton>
        {storeUrl && (
          <DuncitButton
            size="small"
            variant="contained"
            href={storeUrl}
            target="_blank"
            rel="noopener"
            sx={ACTION_SX}
          >
            {t('mweb.openInApp.getApp')}
          </DuncitButton>
        )}
      </Stack>
    </Paper>
  );
}
