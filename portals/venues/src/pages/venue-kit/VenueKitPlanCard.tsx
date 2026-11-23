import { useState, type ComponentType } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CardContent, Chip, Grid, Skeleton, Stack, Typography } from '@mui/material';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import EditIcon from '@mui/icons-material/Edit';
import HandshakeIcon from '@mui/icons-material/Handshake';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import PaymentIcon from '@mui/icons-material/Payment';
import PercentIcon from '@mui/icons-material/Percent';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import type { VenueKitOfferInput } from '@duncit/gql-types';
import { logs } from '@duncit/logs';
import { useUserData } from '@duncit/user-context';
import { parseApiError, resolveVenueKitOffer, VENUE_KIT_FEATURES, venueKitCopyVars, type VenueKitFeature } from '@duncit/utils';
import { VenueKitOfferForm } from './offer-form';
import { UPDATE_VENUE_KIT_OFFER, VENUE_KIT_OFFER } from './queries';

const FEATURE_ICONS: Record<VenueKitFeature, ComponentType<SvgIconProps>> = {
  tableLabels: QrCode2Icon,
  counterStandee: StorefrontIcon,
  smartPos: PointOfSaleIcon,
  freeGiftCards: CardGiftcardIcon,
  collabGiftCards: HandshakeIcon,
  razorpay: PaymentIcon,
  orderBenefit: PercentIcon,
};

/** The plan is national pricing — the server lets only a Super Admin change it. */
const OFFER_EDITOR = 'SUPER_ADMIN';

/** The Venue Kit plan as the website shows it: coming soon, annual only, its seven features. */
export default function VenueKitPlanCard() {
  const { t } = useTranslation();
  const { user } = useUserData();
  const canEdit = (user?.roles ?? []).includes(OFFER_EDITOR);
  const [editing, setEditing] = useState(false);
  const { data, loading, error, refetch } = useQuery(VENUE_KIT_OFFER, { fetchPolicy: 'cache-and-network' });
  const [saveOffer, saveState] = useMutation(UPDATE_VENUE_KIT_OFFER);
  const offer = resolveVenueKitOffer(data?.venueKitOffer);
  const vars = venueKitCopyVars(offer);
  const tv = (key: string) => t(`venueKit.${key}`, { vars });

  // The error state re-renders from the query itself; the log is for us.
  const retry = () => {
    refetch().catch((err: unknown) => {
      logs.portal.venues.error('venueKit', 'offerRetry', { msg: 'Venue Kit offer refetch failed', reason: parseApiError(err) });
    });
  };

  const save = (input: VenueKitOfferInput) => {
    saveOffer({ variables: { input } })
      .then(() => refetch())
      .then(() => {
        notifySuccess(t('venueKit.console.planUpdated'));
        setEditing(false);
      })
      .catch((err: unknown) => {
        const reason = parseApiError(err);
        notifyError(reason);
        logs.portal.venues.warn('venueKit', 'saveOffer', { msg: 'Venue Kit plan save failed', reason });
      });
  };

  if (error && !data) {
    return (
      <Alert severity="error" action={<DuncitButton color="inherit" size="small" onClick={retry}>{t('shell.common.retry')}</DuncitButton>}>
        {parseApiError(error)}
      </Alert>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
              <Chip color="warning" icon={<HourglassTopIcon />} label={tv('comingSoon')} />
              <Chip color="primary" variant="outlined" label={tv('annualOnly')} />
            </Stack>
            {loading && !data ? (
              <Skeleton variant="text" width={180} height={56} />
            ) : (
              <Typography variant="h3" component="p" aria-label={tv('plan.priceLabel')}>
                {tv('plan.price')}{' '}
                <Typography component="span" variant="h6" color="text.secondary">
                  {tv('perYear')}
                </Typography>
              </Typography>
            )}
            <Typography sx={{ mt: 1 }}>{tv('plan.note')}</Typography>
            <Typography color="text.secondary">{tv('plan.comingSoonNote')}</Typography>
          </Box>
          {canEdit && (
            <DuncitButton variant="outlined" startIcon={<EditIcon />} onClick={() => setEditing(true)} disabled={!data} data-testid="venue-kit-edit-plan">
              {t('venueKit.console.editPlan')}
            </DuncitButton>
          )}
        </Stack>

        <Typography variant="h6" component="h2" sx={{ mt: 3, mb: 1.5 }}>
          {tv('features.heading')}
        </Typography>
        <Grid container spacing={2} component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {VENUE_KIT_FEATURES.map((key) => {
            const Icon = FEATURE_ICONS[key];
            return (
              <Grid key={key} size={{ xs: 12, sm: 6, lg: 4 }} component="li">
                <Stack direction="row" spacing={1.5}>
                  <Icon color="primary" aria-hidden />
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{tv(`features.${key}.title`)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {tv(`features.${key}.text`)}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
      {canEdit && data && (
        <VenueKitOfferForm open={editing} offer={offer} saving={saveState.loading} onClose={() => setEditing(false)} onSubmit={save} />
      )}
    </Card>
  );
}
