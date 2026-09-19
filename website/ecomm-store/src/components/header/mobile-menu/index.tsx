import { useId, useState } from 'react';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';

import { useStoreT } from '../../../i18n';
import { CircleButton } from '../../CircleButton';
import { MobileMenuDrawer } from './MobileMenuDrawer';

/**
 * The phone's hamburger: a round button that opens the full menu drawer. Only
 * the phone headers render it — the desktop header has the mega menu.
 */
export function MobileMenuButton() {
  const { t } = useStoreT();
  const [open, setOpen] = useState(false);
  const drawerId = useId();
  return (
    <>
      <CircleButton
        aria-label={t('ecommStore.menu.open')}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? drawerId : undefined}
        onClick={() => setOpen(true)}
        data-testid="mobile-menu-open"
      >
        <MenuRoundedIcon />
      </CircleButton>
      <MobileMenuDrawer id={drawerId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
