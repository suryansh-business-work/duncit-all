import { Box, Skeleton, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  selectedLocationName?: string;
  selectedZoneName?: string;
  loading: boolean;
  hasData: boolean;
  onOpen: () => void;
}

/** The location pill — coral pin + "City · Zone" + chevron — that opens the
 * location picker. Every studio mode renders it — a host, venue owner or club
 * admin browses the same city list a user does, so the switcher is never
 * hidden behind a role. Native twin: components/AppHeader/HeaderLocationRow. */
export default function HeaderLocationRow({
  selectedLocationName,
  selectedZoneName,
  loading,
  hasData,
  onOpen,
}: Readonly<Props>) {
  const { t } = useTranslation();
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
      aria-label={t('mweb.appHeader.changeCityOrZone')}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        flex: '0 1 auto',
        height: 40,
        minHeight: 40,
        minWidth: 0,
        maxWidth: '100%',
        px: 1.5,
        boxSizing: 'border-box',
        borderRadius: 999,
        cursor: 'pointer',
        bgcolor: 'background.paper',
        border: '1px solid var(--duncit-card-border)',
      }}
    >
      {loading && !hasData ? (
        <Skeleton variant="text" width={110} height={16} />
      ) : (
        <>
          <LocationOnIcon sx={{ fontSize: 18, color: 'secondary.main', flex: '0 0 auto' }} />
          <Typography
            noWrap
            sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', minWidth: 0 }}
          >
            {cityText}
          </Typography>
          <KeyboardArrowDownIcon sx={{ fontSize: 18, color: 'text.secondary', flex: '0 0 auto' }} />
        </>
      )}
    </Box>
  );
}
