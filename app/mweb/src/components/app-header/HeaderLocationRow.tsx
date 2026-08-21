import { Box, Skeleton, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LocationOnIcon from '@mui/icons-material/LocationOn';

interface Props {
  selectedLocationName?: string;
  selectedZoneName?: string;
  loading: boolean;
  hasData: boolean;
  onOpen: () => void;
}

/** The tappable pin + city (· zone) + chevron that opens the location picker.
 * Every studio mode renders it — a host, venue owner or club admin browses the
 * same city list a user does, so the switcher is never hidden behind a role. */
export default function HeaderLocationRow({
  selectedLocationName,
  selectedZoneName,
  loading,
  hasData,
  onOpen,
}: Readonly<Props>) {
  const cityText = selectedZoneName
    ? `${selectedLocationName ?? 'Select city'} · ${selectedZoneName}`
    : (selectedLocationName ?? 'Select city');

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpen();
      }}
      aria-label="Change city or zone"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        cursor: 'pointer',
        color: 'primary.main',
        minWidth: 0,
        minHeight: 'auto',
        maxWidth: { xs: 210, sm: 340 },
      }}
    >
      {loading && !hasData ? (
        <Skeleton variant="text" width={90} height={14} />
      ) : (
        <>
          <LocationOnIcon sx={{ fontSize: 15, flex: '0 0 auto' }} />
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}
            noWrap
          >
            {cityText}
          </Typography>
          <KeyboardArrowDownIcon sx={{ fontSize: 16, flex: '0 0 auto' }} />
        </>
      )}
    </Box>
  );
}
