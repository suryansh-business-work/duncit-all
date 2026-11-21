import { useNavigate } from 'react-router';
import { Alert, Box, Stack, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlineRounded';
import { DuncitButton } from '@duncit/buttons';
import { logs } from '@duncit/logs';
import { PICK_VENUE_PARAM, formatStatementMoney, venueHostTermLines, type VenueHostTerms } from '@duncit/utils';
import SectionHeader from '../../components/SectionHeader';
import { usePricing } from '../../hooks/usePricing';
import { useVenueHostTerms } from '../../hooks/useVenueHostTerms';
import { useTranslation } from '../../i18n/useTranslation';
import { SURFACE_SX } from '../../theme';

/**
 * For a host only: the venue's Fees & Minimum Spend — the minimums an offer
 * must meet, then the fees added to its price — and "Pick This Venue for Pod",
 * which opens Create Pod with this venue and a physical pod chosen. The server
 * answers the terms only for an active host, so anyone else sees nothing here.
 * Native twin: details/VenueHostTermsCard.
 */
export default function VenueHostTermsCard({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const { byId, error, refetch } = useVenueHostTerms([venueId]);
  const terms = byId.get(venueId);

  if (error) {
    return (
      <Alert
        data-testid="venue-host-terms-error"
        severity="warning"
        action={
          <DuncitButton
            data-testid="venue-host-terms-retry"
            color="inherit"
            size="small"
            onClick={() => {
              refetch().catch((retryError: unknown) => logs.mWeb.warn('venue-details', 'hostTermsRetry', { error: retryError }));
            }}
          >
            {t('publicPage.hostPage.retry')}
          </DuncitButton>
        }
      >
        {t('availability.hostTerms.loadFailed')}
      </Alert>
    );
  }
  return terms ? <HostTermsBody venueId={venueId} terms={terms} /> : null;
}

/** The terms and the button — only ever mounted for a host. */
function HostTermsBody({ venueId, terms }: Readonly<{ venueId: string; terms: VenueHostTerms }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currency } = usePricing();
  const lines = venueHostTermLines(terms, t, (value) => formatStatementMoney(value, currency));
  return (
    <Stack spacing={1.5} sx={{ ...SURFACE_SX, p: 2 }} data-testid="venue-host-terms">
      <Box>
        <SectionHeader testId="venue-host-terms-header" title={t('mweb.studioOptions.venueFees')} />
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {t('availability.hostTerms.hint')}
        </Typography>
      </Box>
      {lines.length > 0 ? (
        <Stack component="ul" spacing={0.75} sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {lines.map((line) => (
            <Stack component="li" key={line.id} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }} data-testid={`venue-host-terms-${line.id}`}>
              <CheckCircleOutlineIcon aria-hidden sx={{ fontSize: 18, color: 'brand.main', mt: '1px' }} />
              <Typography variant="body2">{line.text}</Typography>
            </Stack>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="venue-host-terms-none">
          {t('availability.hostTerms.none')}
        </Typography>
      )}
      <DuncitButton
        data-testid="venue-pick-for-pod"
        variant="contained"
        size="large"
        fullWidth
        startIcon={<AddCircleOutlineIcon />}
        aria-describedby="venue-pick-for-pod-hint"
        onClick={() => navigate(`/create-pod?${PICK_VENUE_PARAM}=${encodeURIComponent(venueId)}`)}
      >
        {t('availability.hostTerms.pickForPod')}
      </DuncitButton>
      <Typography id="venue-pick-for-pod-hint" variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
        {t('availability.hostTerms.pickForPodHint')}
      </Typography>
    </Stack>
  );
}
