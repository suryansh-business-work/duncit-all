import { useState } from 'react';
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

const DISMISS_KEY = 'duncit:app-banner-dismissed';
const IOS_RX = /iphone|ipad|ipod/i;

const isMobileUa = () => /android/i.test(navigator.userAgent) || IOS_RX.test(navigator.userAgent);

/**
 * Mobile-only "open in app" bar: a shared mWeb link opens the installed app via
 * the duncit:// deep link (same path — native linking mirrors mWeb routes);
 * without the app the store link downloads it. Dismissible (persisted) so it
 * never nags — Android App Links handle the automatic app-open when verified.
 */
export default function OpenInAppBanner() {
  const location = useLocation();
  const [dismissed, setDismissed] = useState(
    () => globalThis.localStorage?.getItem(DISMISS_KEY) === '1',
  );
  const mobile = isMobileUa();
  const { data } = useQuery(APP_VERSION_INFO, { skip: !mobile || dismissed, fetchPolicy: 'cache-first' });

  if (!mobile || dismissed) return null;
  const storeUrl = IOS_RX.test(navigator.userAgent)
    ? data?.appVersionInfo?.ios_store_url
    : data?.appVersionInfo?.android_store_url;

  const dismiss = () => {
    setDismissed(true);
    globalThis.localStorage?.setItem(DISMISS_KEY, '1');
  };

  const openInApp = () => {
    // Deep-link into the installed app at the same path; a missing app is a
    // silent no-op and the user stays on mWeb.
    globalThis.location.href = `duncit:/${location.pathname}${location.search}`;
  };

  return (
    <Paper
      data-testid="open-in-app-banner"
      elevation={6}
      sx={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: (t) => t.zIndex.snackbar,
        borderRadius: 3,
        p: 1.25,
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <InstallMobileIcon color="primary" />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" fontWeight={800} noWrap>
            Duncit is better in the app
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            Open this page in the app or get it free.
          </Typography>
        </Box>
        <Button size="small" variant="outlined" onClick={openInApp} sx={{ flexShrink: 0, fontWeight: 800 }}>
          Open
        </Button>
        {storeUrl && (
          <Button
            size="small"
            variant="contained"
            href={storeUrl}
            target="_blank"
            rel="noopener"
            sx={{ flexShrink: 0, fontWeight: 800 }}
          >
            Get app
          </Button>
        )}
        <IconButton size="small" aria-label="Dismiss" onClick={dismiss}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Paper>
  );
}
