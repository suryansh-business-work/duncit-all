import { useId } from 'react';
import { Box, Divider, Drawer, Stack, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

import { useStoreT } from '../../../i18n';
import { CircleButton } from '../../CircleButton';
import { useNavigationData } from '../navigation';
import { SearchForm } from '../search-form';
import { AccountSection, HelpSection, ShopLinks } from './MenuSections';
import { PetSections } from './PetSections';

interface MobileMenuDrawerProps {
  /** The id the opening button names in `aria-controls`. */
  id: string;
  open: boolean;
  onClose: () => void;
}

const PAPER_SX = { width: 'min(100vw, 360px)' } as const;

/**
 * The whole store in a left drawer: search, pets and their aisles, the shop
 * links, the account, and help. Every link closes it as it navigates.
 */
export function MobileMenuDrawer({ id, open, onClose }: Readonly<MobileMenuDrawerProps>) {
  const { t } = useStoreT();
  const nav = useNavigationData();
  const titleId = useId();
  return (
    <Drawer anchor="left" open={open} onClose={onClose} slotProps={{ paper: { id, role: 'dialog', 'aria-labelledby': titleId, sx: PAPER_SX } }}>
      <Stack sx={{ height: '100%' }} data-testid="mobile-menu-drawer">
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
          <Typography id={titleId} variant="h3" component="h2">
            {t('ecommStore.menu.title')}
          </Typography>
          <CircleButton aria-label={t('ecommStore.menu.close')} onClick={onClose} data-testid="mobile-menu-close">
            <CloseRoundedIcon />
          </CircleButton>
        </Stack>
        <Box sx={{ px: 2, pb: 1.5 }}>
          <SearchForm id="mobile-menu-search" onDone={onClose} />
        </Box>
        <Divider />
        <Box component="nav" aria-label={t('ecommStore.menu.main')} sx={{ overflowY: 'auto', flexGrow: 1, pb: 4 }}>
          <PetSections nav={nav} onNavigate={onClose} />
          <Divider />
          <ShopLinks nav={nav} onNavigate={onClose} />
          <Divider />
          <AccountSection onNavigate={onClose} />
          <Divider />
          <HelpSection pages={nav.pages} onNavigate={onClose} />
        </Box>
      </Stack>
    </Drawer>
  );
}
