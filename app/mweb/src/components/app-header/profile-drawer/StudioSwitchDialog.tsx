import { JSX, useEffect, useState } from 'react';
import { Box, ButtonBase, Dialog, DialogContent, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import PersonIcon from '@mui/icons-material/Person';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import GroupsIcon from '@mui/icons-material/Groups';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { DuncitButton } from '@duncit/buttons';
import { STUDIO_LABEL, availableModes, type StudioMode } from '../../../studio-mode';
import { useTranslation } from '../../../i18n/useTranslation';

const ICONS: Record<StudioMode, JSX.Element> = {
  USER: <PersonIcon fontSize="small" />,
  HOST: <DashboardIcon fontSize="small" />,
  VENUE: <StorefrontIcon fontSize="small" />,
  ECOMM: <Inventory2Icon fontSize="small" />,
  CLUB: <GroupsIcon fontSize="small" />,
};

const ACTIVE_CAPTION = 'Active right now';
const PENDING_CAPTION = 'Selected — press Switch to confirm';

/** Label for the confirm button — naming the target makes the two-step flow obvious. */
const switchButtonLabel = (changed: boolean, mode: StudioMode) =>
  changed ? `Switch to ${STUDIO_LABEL[mode]}` : 'Switch';

interface Props {
  open: boolean;
  roles: string[];
  /** `is_product_visible` — off, and the E-commerce bubble is not offered. */
  showProducts?: boolean;
  current: StudioMode;
  onClose: () => void;
  onSelect: (mode: StudioMode) => void;
}

/** Bubble-style role switcher — one bubble per mode; the picked one lifts up
 * and expands into the big primary card below. Picking a bubble only stages the
 * choice; nothing switches until the Switch button below is pressed. */
export default function StudioSwitchDialog({ open, roles, showProducts = true, current, onClose, onSelect }: Readonly<Props>) {
  const { t } = useTranslation();
  const options = availableModes(roles, { products: showProducts });
  const [pending, setPending] = useState<StudioMode>(current);

  // The dialog stays mounted between openings, so the staged pick is reset every
  // time it opens — otherwise it would reopen on a choice the user abandoned.
  useEffect(() => {
    setPending(current);
  }, [open, current]);

  const changed = pending !== current;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="studio-switch-title">
      <DialogContent sx={{ p: 2.5 }}>
        <Typography id="studio-switch-title" sx={{ fontSize: '1.125rem', fontWeight: 600, mb: 2 }}>
          {t('mweb.common.switchRole')}
        </Typography>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            justifyContent: "center",
            mb: 2
          }}>
          {options.map((option) => {
            const selected = option.mode === pending;
            return (
              <ButtonBase
                key={option.mode}
                aria-label={STUDIO_LABEL[option.mode]}
                aria-pressed={selected}
                onClick={() => setPending(option.mode)}
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  color: selected ? 'primary.contrastText' : 'text.primary',
                  bgcolor: selected ? 'primary.main' : 'action.hover',
                  transition: 'background-color 180ms ease, color 180ms ease',
                }}
              >
                {ICONS[option.mode]}
              </ButtonBase>
            );
          })}
        </Stack>
        <Box
          key={pending}
          sx={{
            borderRadius: '18px',
            px: 2,
            py: 1.75,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            animation: 'duncit-role-card-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            '@keyframes duncit-role-card-in': {
              from: { opacity: 0.4, transform: 'translateY(8px) scale(0.97)' },
              to: { opacity: 1, transform: 'translateY(0) scale(1)' },
            },
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 600, lineHeight: 1.2 }} noWrap>
              {STUDIO_LABEL[pending]}
            </Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary' }}>
              {changed ? PENDING_CAPTION : ACTIVE_CAPTION}
            </Typography>
          </Box>
          <CheckCircleIcon color="primary" />
        </Box>
        <DuncitButton
          fullWidth
          size="large"
          variant="contained"
          disabled={!changed}
          onClick={() => onSelect(pending)}
          sx={{ mt: 2, height: 52 }}
        >
          {switchButtonLabel(changed, pending)}
        </DuncitButton>
      </DialogContent>
    </Dialog>
  );
}
