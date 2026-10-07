import { Avatar, Box, Card, Stack, Typography } from '@mui/material';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { DuncitButton } from '@duncit/buttons';
import { formatPodRequestKm, type PodRequestStatus } from '@duncit/utils';
import PodRequestStatusChip from '../pod-requests/components/PodRequestStatusChip';
import { useTranslation } from '../../i18n/useTranslation';

/** One search result, host or venue, in the shape the card draws. */
export interface NearbyItem {
  id: string;
  kind: 'HOST' | 'VENUE';
  name: string;
  imageUrl: string;
  /** Category for a venue, categories for a host. */
  category: string;
  /** Locality and city — venues only. */
  place: string;
  distanceKm: number;
  /** Set while this pair already has a live request: the card shows it instead of the CTA. */
  openStatus: PodRequestStatus | null;
}

interface Props {
  item: NearbyItem;
  /** No requests left this month. */
  disabled: boolean;
  onRequest: (item: NearbyItem) => void;
}

/** A nearby host or venue: photo, name, category, place, distance and "Request Pod". */
export default function NearbyCard({ item, disabled, onRequest }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Card sx={{ p: 2 }} data-testid={`nearby-card-${item.id}`}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Avatar
          variant={item.kind === 'VENUE' ? 'rounded' : 'circular'}
          src={item.imageUrl || undefined}
          alt=""
          sx={{ width: 64, height: 64, bgcolor: 'action.hover', color: 'primary.main' }}
        >
          {item.kind === 'VENUE' ? <StorefrontRoundedIcon /> : <PersonRoundedIcon />}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
            {item.name}
          </Typography>
          {item.category && (
            <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
              {item.category}
            </Typography>
          )}
          {item.place && (
            <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
              {item.place}
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
            {t('podRequests.distanceAway', { vars: { km: formatPodRequestKm(item.distanceKm) } })}
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1.5 }}>
        {item.openStatus ? (
          <PodRequestStatusChip status={item.openStatus} testId={`nearby-card-status-${item.id}`} />
        ) : (
          <DuncitButton
            variant="contained"
            size="small"
            startIcon={<SendRoundedIcon />}
            disabled={disabled}
            onClick={() => onRequest(item)}
            data-testid={`nearby-card-request-${item.id}`}
          >
            {t('podRequests.requestPod')}
          </DuncitButton>
        )}
      </Stack>
    </Card>
  );
}
