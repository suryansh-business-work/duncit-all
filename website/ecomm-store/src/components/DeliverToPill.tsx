import { useState } from 'react';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import FmdGoodOutlinedIcon from '@mui/icons-material/FmdGoodOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

import { usePincode } from '../lib/usePincode';
import { useStoreT } from '../i18n';
import { STORE_TOKENS as T } from '../theme/tokens';
import { PincodeDialog } from './pincode-form';

/** "Deliver to 400001": opens the pincode dialog. */
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
        sx={{
          borderRadius: T.radius.pill,
          border: 1,
          borderColor: T.border,
          bgcolor: T.surface,
          pl: 0.5,
          pr: 1.5,
          py: 0.5,
          minHeight: 48,
          textAlign: 'left',
          minWidth: 0,
          maxWidth: '100%',
          '&:hover': { borderColor: T.inputBorder },
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Box
            sx={{ width: 38, height: 38, flexShrink: 0, borderRadius: '50%', bgcolor: T.brandTint, color: T.ctaInk, display: 'grid', placeItems: 'center' }}
            aria-hidden
          >
            <FmdGoodOutlinedIcon fontSize="small" />
          </Box>
          <Stack aria-hidden sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ lineHeight: 1.1 }}>
              {t('ecommStore.deliverTo.caption')}
            </Typography>
            <Stack direction="row" sx={{ alignItems: 'center', minWidth: 0 }}>
              <Typography noWrap sx={{ fontWeight: 800 }}>
                {place}
              </Typography>
              <KeyboardArrowDownIcon fontSize="small" />
            </Stack>
          </Stack>
        </Stack>
      </ButtonBase>
      <PincodeDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
