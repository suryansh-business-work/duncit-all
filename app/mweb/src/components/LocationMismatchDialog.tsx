import type { ReactNode } from 'react';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import PlaceIcon from '@mui/icons-material/Place';
import { DuncitButton } from '@duncit/buttons';
import type { LocationMismatch } from '@duncit/utils';
import type { Translate } from '../i18n/fallback';
import { useTranslation } from '../i18n/useTranslation';
import type { LocationPrompt } from '../hooks/useLocationMismatch';

/** Which kind of page the link opened — it changes only the opening sentence. */
export type LocationMismatchKind = 'POD' | 'CLUB' | 'VENUE';

type Props = LocationPrompt & { kind: LocationMismatchKind };

function introText(t: Translate, kind: LocationMismatchKind, found: LocationMismatch): string {
  const vars = { current: found.current, target: found.target };
  if (kind === 'POD') return t('mweb.locationMismatch.introPod', { vars });
  if (kind === 'CLUB') return t('mweb.locationMismatch.introClub', { vars });
  return t('mweb.locationMismatch.introVenue', { vars });
}

function LocationRow({
  icon,
  label,
  value,
}: Readonly<{ icon: ReactNode; label: string; value: string }>) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: 'secondary.main',
          bgcolor: 'action.hover',
          flex: '0 0 auto',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {label}
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

/**
 * Opens over a pod, club or venue that a link brought the viewer to when that
 * place is in a city other than the one their header is set to. It names both
 * places and offers the switch; "Continue" leaves the header alone. The native
 * app renders the same sentences in Tamagui (rule 27).
 */
export default function LocationMismatchDialog({
  kind,
  mismatch,
  switchLocation,
  keepLocation,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (!mismatch) return null;
  return (
    <Dialog open onClose={keepLocation} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontSize: 20, fontWeight: 600 }}>{t('mweb.locationMismatch.title')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2">{introText(t, kind, mismatch)}</Typography>
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          <LocationRow
            icon={<MyLocationIcon fontSize="small" />}
            label={t('mweb.locationMismatch.currentLocation')}
            value={mismatch.current}
          />
          <LocationRow
            icon={<PlaceIcon fontSize="small" />}
            label={t('mweb.locationMismatch.linkLocation')}
            value={mismatch.target}
          />
        </Stack>
      </DialogContent>
      {/* The switch leads, full width; staying put sits under it. */}
      <DialogActions
        disableSpacing
        sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 1, px: 3, pt: 1, pb: 3 }}
      >
        <DuncitButton variant="contained" size="large" fullWidth onClick={switchLocation}>
          {t('mweb.locationMismatch.switchButton', { vars: { target: mismatch.targetCity } })}
        </DuncitButton>
        <DuncitButton variant="outlined" size="large" fullWidth onClick={keepLocation}>
          {t('mweb.locationMismatch.keepButton', { vars: { current: mismatch.currentCity } })}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
