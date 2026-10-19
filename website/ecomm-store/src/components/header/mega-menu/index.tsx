import { useId, useState } from 'react';
import { Popover } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PetsRoundedIcon from '@mui/icons-material/PetsRounded';
import { DuncitButton } from '@duncit/buttons';

import type { StoreNavigation, StorePetType } from '../../../graphql/settings';
import { useStoreT } from '../../../i18n';
import { MegaMenuPanel } from './MegaMenuPanel';

/**
 * The desktop "Shop by pet" menu: a solid pill disclosure button opening a
 * panel that traps focus and closes on Escape; every entry is a real link.
 * The header's nav row owns the surrounding `<nav>`.
 */
export function MegaMenu({ nav }: Readonly<{ nav: StoreNavigation }>) {
  const { t } = useStoreT();
  const panelId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [activePet, setActivePet] = useState<StorePetType | null>(null);
  const open = Boolean(anchor);
  const close = () => setAnchor(null);

  return (
    <>
      <DuncitButton
        variant="contained"
        startIcon={<PetsRoundedIcon />}
        endIcon={<ExpandMoreIcon sx={{ transition: 'transform 150ms', transform: open ? 'rotate(180deg)' : 'none' }} />}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={(event) => {
          setActivePet((current) => current ?? nav.pet_types[0] ?? null);
          setAnchor(event.currentTarget);
        }}
        sx={{ flexShrink: 0, px: 2.5 }}
        data-testid="mega-menu-open"
      >
        {t('ecommStore.menu.shopByPet')}
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
    </>
  );
}
