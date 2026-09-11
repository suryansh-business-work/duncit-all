import { Chip, Stack } from '@mui/material';
import { alpha } from '@mui/material/styles';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import HeaderLocationRow from './HeaderLocationRow';
import { STUDIO_LABEL, type StudioMode } from '../../studio-mode';

interface Props {
  minimal: boolean;
  studio: StudioMode;
  onOpenStudioSwitch: () => void;
  selectedLocationName?: string;
  selectedZoneName?: string;
  placeReady: boolean;
  onOpenLocation: () => void;
}

/**
 * Row one's left side: the location pill, led by the role pill in a studio.
 * A studio header keeps the location switcher — a host/venue/club account
 * still browses a city, so the picker stays. The survey header (`minimal`)
 * has no city to browse yet and shows neither.
 */
export default function HeaderLeading({
  minimal,
  studio,
  onOpenStudioSwitch,
  selectedLocationName,
  selectedZoneName,
  placeReady,
  onOpenLocation,
}: Readonly<Props>) {
  if (minimal) return <Stack sx={{ flex: 1, minWidth: 0 }} />;
  return (
    <Stack direction="row" spacing={1} sx={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
      {studio === 'USER' ? null : (
        <Chip
          label={STUDIO_LABEL[studio]}
          icon={<SwapHorizIcon />}
          onClick={onOpenStudioSwitch}
          sx={{
            flex: '0 0 auto',
            height: 40,
            px: 0.5,
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            color: 'primary.main',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
            '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.18) },
            '& .MuiChip-icon': { color: 'primary.main', fontSize: 16 },
          }}
        />
      )}
      <HeaderLocationRow
        selectedLocationName={selectedLocationName}
        selectedZoneName={selectedZoneName}
        loading={!placeReady}
        hasData={placeReady}
        onOpen={onOpenLocation}
      />
    </Stack>
  );
}
