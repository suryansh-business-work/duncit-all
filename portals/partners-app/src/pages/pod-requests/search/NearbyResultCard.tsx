import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { PodRequestStatus } from '@duncit/utils';
import PodRequestStatusChip from '../PodRequestStatusChip';

export interface NearbyCardData {
  id: string;
  name: string;
  image: string;
  /** Category, then locality/city — whatever the card can say about them. */
  lines: string[];
  distanceKm: number;
  openStatus?: PodRequestStatus | null;
  /** A person (round photo) or a place (rounded cover). */
  round: boolean;
}

interface Props {
  item: NearbyCardData;
  canRequest: boolean;
  onRequest: (item: NearbyCardData) => void;
}

/** One nearby host or venue: who, where, how far, and Request Pod (or the live request's state). */
export default function NearbyResultCard({ item, canRequest, onRequest }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 3, height: '100%' }} data-testid="nearby-result">
      <Stack spacing={1.5} sx={{ height: '100%' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Avatar
            src={item.image || undefined}
            alt=""
            variant={item.round ? 'circular' : 'rounded'}
            sx={(theme) => ({ width: theme.spacing(7), height: theme.spacing(7) })}
          >
            {item.name.charAt(0)}
          </Avatar>
          <Stack sx={{ minWidth: 0 }} spacing={0.25}>
            <Typography component="h3" sx={{ fontWeight: 700 }} noWrap>
              {item.name}
            </Typography>
            {item.lines.filter(Boolean).map((line) => (
              <Typography key={line} variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                {line}
              </Typography>
            ))}
            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
              {t('podRequests.distanceAway', { vars: { km: item.distanceKm } })}
            </Typography>
          </Stack>
        </Stack>
        <Stack direction="row" sx={{ mt: 'auto', justifyContent: 'flex-end' }}>
          {item.openStatus ? (
            <PodRequestStatusChip status={item.openStatus} />
          ) : (
            <DuncitButton
              size="small"
              variant="contained"
              disabled={!canRequest}
              endIcon={<SendRoundedIcon />}
              onClick={() => onRequest(item)}
            >
              {t('podRequests.requestPod')}
            </DuncitButton>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}
