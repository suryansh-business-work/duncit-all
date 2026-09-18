import { useState } from 'react';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import FmdGoodOutlinedIcon from '@mui/icons-material/FmdGoodOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

import { usePincode } from '../lib/usePincode';
import { useStoreT } from '../i18n';
import { STORE_TOKENS as T } from '../theme/tokens';
import { PincodeDialog } from './pincode-form';

/** "Deliver to 400001" — opens the pincode dialog. */
export function DeliverToPill() {
  const { t } = useStoreT();
  const [pincode] = usePincode();
  const [open, setOpen] = useState(false);
  const place = pincode || t('ecommStore.deliverTo.choose');
  return (
    <>
      <ButtonBase
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={t('ecommStore.deliverTo.label', { vars: { place } })}
        sx={{ borderRadius: T.radius.pill, px: 1, py: 0.5, minHeight: 44, textAlign: 'left' }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box
            sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: T.surface, border: 1, borderColor: T.border, display: 'grid', placeItems: 'center' }}
            aria-hidden
          >
            <FmdGoodOutlinedIcon fontSize="small" />
          </Box>
          <Stack aria-hidden>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1 }}>
              {t('ecommStore.deliverTo.caption')}
            </Typography>
            <Stack direction="row" sx={{ alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 800 }}>{place}</Typography>
              <KeyboardArrowDownIcon fontSize="small" />
            </Stack>
          </Stack>
        </Stack>
      </ButtonBase>
      <PincodeDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
