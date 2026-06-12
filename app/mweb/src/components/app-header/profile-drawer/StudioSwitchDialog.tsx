import { JSX } from 'react';
import { Box, ButtonBase, Dialog, DialogContent, Stack, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { STUDIO_LABEL, availableModes, type StudioMode } from '../../../studio-mode';

const ICONS: Record<StudioMode, JSX.Element> = {
  USER: <PersonIcon fontSize="small" />,
  HOST: <DashboardIcon fontSize="small" />,
  VENUE: <StorefrontIcon fontSize="small" />,
  ECOMM: <Inventory2Icon fontSize="small" />,
};

interface Props {
  open: boolean;
  roles: string[];
  current: StudioMode;
  onClose: () => void;
  onSelect: (mode: StudioMode) => void;
}

/** Bubble-style role switcher — one bubble per mode; the active one lifts up
 * and expands into the big primary card below, with smooth transitions. */
export default function StudioSwitchDialog({ open, roles, current, onClose, onSelect }: Readonly<Props>) {
  const options = availableModes(roles);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="studio-switch-title">
      <DialogContent sx={{ pb: 3 }}>
        <Typography id="studio-switch-title" variant="subtitle1" sx={{ fontWeight: 900, mb: 2 }}>
          Switch role
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 2 }}>
          {options.map((option) => {
            const selected = option.mode === current;
            return (
              <ButtonBase
                key={option.mode}
                aria-label={option.label}
                aria-pressed={selected}
                onClick={() => onSelect(option.mode)}
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  color: selected ? 'primary.contrastText' : 'text.secondary',
                  bgcolor: selected ? 'primary.main' : 'action.hover',
                  border: 2,
                  borderColor: selected ? 'primary.main' : 'divider',
                  transform: selected ? 'translateY(-6px) scale(1.12)' : 'none',
                  boxShadow: selected ? '0 12px 26px rgba(255,79,115,0.38)' : 'none',
                  transition: 'all 240ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
              >
                {ICONS[option.mode]}
              </ButtonBase>
            );
          })}
        </Stack>
        <Box
          key={current}
          sx={{
            borderRadius: 4,
            px: 2.5,
            py: 2,
            color: 'primary.contrastText',
            background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)',
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
            <Typography variant="h6" sx={{ fontWeight: 950, lineHeight: 1.1 }} noWrap>
              {STUDIO_LABEL[current]}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 700 }}>
              Active right now — tap a bubble to switch
            </Typography>
          </Box>
          <CheckCircleIcon />
        </Box>
      </DialogContent>
    </Dialog>
  );
}
