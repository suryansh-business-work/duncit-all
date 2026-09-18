import { useId, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { Popover, Stack } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DuncitButton } from '@duncit/buttons';

import type { StorePetType } from '../../../graphql/settings';
import { paths } from '../../../lib/paths';
import { useStoreT } from '../../../i18n';
import { useNavigationData } from '../navigation';
import { MegaMenuPanel } from './MegaMenuPanel';

/**
 * The desktop "Shop by pet" menu. A disclosure button opens a panel that traps
 * focus and closes on Escape; every entry is a real link.
 */
export function MegaMenu() {
  const { t } = useStoreT();
  const nav = useNavigationData();
  const panelId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [activePet, setActivePet] = useState<StorePetType | null>(null);
  const open = Boolean(anchor);
  const close = () => setAnchor(null);

  return (
    <Stack component="nav" direction="row" spacing={1} aria-label={t('ecommStore.menu.main')} sx={{ display: { xs: 'none', md: 'flex' } }}>
      <DuncitButton
        color="inherit"
        endIcon={<ExpandMoreIcon />}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={(event) => {
          setActivePet((current) => current ?? nav.pet_types[0] ?? null);
          setAnchor(event.currentTarget);
        }}
      >
        {t('ecommStore.menu.shopByPet')}
      </DuncitButton>
      <DuncitButton color="inherit" component={RouterLink} to={paths.shop}>
        {t('ecommStore.menu.shopAll')}
      </DuncitButton>
      <DuncitButton color="inherit" component={RouterLink} to={paths.brands}>
        {t('ecommStore.menu.brands')}
      </DuncitButton>
      <Popover
        id={panelId}
        open={open}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { variant: 'outlined', sx: { mt: 1 } } }}
      >
        <MegaMenuPanel nav={nav} activePet={activePet} onPickPet={setActivePet} onNavigate={close} />
      </Popover>
    </Stack>
  );
}
