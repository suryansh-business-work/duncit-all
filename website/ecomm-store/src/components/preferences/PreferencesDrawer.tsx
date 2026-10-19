import { useId } from 'react';
import { Divider, Drawer, Stack, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

import { useStoreT } from '../../i18n';
import { CircleButton } from '../CircleButton';
import { AccessibilitySection } from './AccessibilitySection';
import { AppearanceSection } from './AppearanceSection';
import { PrivacyAndAppSection } from './PrivacyAndAppSection';

interface PreferencesDrawerProps {
  open: boolean;
  /** Return focus to the opener on close; off when the cookie banner takes it. */
  restoreFocus: boolean;
  onClose: (restoreFocus: boolean) => void;
}

const PAPER_SX = { width: 'min(100vw, 400px)', borderRadius: 0 } as const;

/**
 * The display & accessibility sidebar: colour mode, text size, link and motion
 * choices, festive animation, cookies and installing the app. A modal drawer —
 * focus stays inside, Escape and the close button both close it.
 */
export function PreferencesDrawer({ open, restoreFocus, onClose }: Readonly<PreferencesDrawerProps>) {
  const { t } = useStoreT();
  const titleId = useId();
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={() => onClose(true)}
      disableRestoreFocus={!restoreFocus}
      slotProps={{ paper: { role: 'dialog', 'aria-modal': true, 'aria-labelledby': titleId, sx: PAPER_SX } }}
    >
      <Stack sx={{ height: '100%' }} data-testid="preferences-drawer">
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}>
          <Typography id={titleId} variant="h3" component="h2">
            {t('ecommStore.prefs.title')}
          </Typography>
          <CircleButton aria-label={t('ecommStore.prefs.close')} onClick={() => onClose(true)}>
            <CloseRoundedIcon />
          </CircleButton>
        </Stack>
        <Divider />
        <Stack spacing={3} sx={{ overflowY: 'auto', flexGrow: 1, px: 3, py: 3 }}>
          <AppearanceSection />
          <Divider />
          <AccessibilitySection />
          <Divider />
          <PrivacyAndAppSection onCookies={() => onClose(false)} />
          <Typography variant="body2" color="text.secondary">
            {t('ecommStore.prefs.note')}
          </Typography>
        </Stack>
      </Stack>
    </Drawer>
  );
}
