import { Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useDateFormat } from '@duncit/app-settings';
import {
  canWithdrawChangeRequest,
  changeRequestRoleKey,
  changeRequestStatusKey,
  changeRequestTone,
  type PodChangeRow,
} from '@duncit/utils';
import { useTranslation } from './i18n';

/** One `Label  Value` fact. Hoisted so it is never redefined per render. */
function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Stack sx={{ minWidth: 120 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Stack>
  );
}

interface Props {
  row: PodChangeRow;
  /** Set on the "waiting on you" list — the two answers a candidate may give. */
  onApprove?: () => void;
  onPass?: () => void;
  /** Set on the requester's own list, while the request is still theirs to pull. */
  onWithdraw?: () => void;
  busy: boolean;
}

/**
 * One change request, in a partner studio.
 *
 * The SAME card renders both lists — a request you filed and one you are being
 * asked to take — because they are the same record read from two ends, and two
 * cards would be two places for "what does OFFERED mean" to drift. Which
 * buttons appear is the caller's decision, not a second component's.
 */
export default function ChangeRequestCard({
  row,
  onApprove,
  onPass,
  onWithdraw,
  busy,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();

  const showWithdraw = Boolean(onWithdraw) && canWithdrawChangeRequest(row);
  const slotWhen = row.offer?.slot_start_at ? formatDateTime(row.offer.slot_start_at) : '';

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }} noWrap>
                {row.pod.pod_title}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {formatDateTime(row.pod.pod_date_time)}
              </Typography>
            </Stack>
            <Chip
              size="small"
              label={t(changeRequestRoleKey(row.role))}
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
            <Chip
              size="small"
              color={changeRequestTone(row)}
              label={t(changeRequestStatusKey(row))}
              sx={{ fontWeight: 700 }}
            />
          </Stack>

          <Divider />

          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2 }}>
            <Fact label={t('changeRequest.requestNo')} value={row.change_request_no} />
            <Fact label={t('changeRequest.filedOn')} value={formatDateTime(row.created_at)} />
            <Fact
              label={t('changeRequest.attendees')}
              value={String(row.pod.attendee_count)}
            />
            {row.health_penalty > 0 && (
              <Fact
                label={t('changeRequest.pointsDeducted')}
                value={`-${row.health_penalty}`}
              />
            )}
            {slotWhen && <Fact label={t('changeRequest.slot')} value={slotWhen} />}
          </Stack>

          <Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              {t('changeRequest.reason')}
            </Typography>
            <Typography variant="body2">
              {row.reason || t('changeRequest.noReason')}
            </Typography>
          </Stack>

          {(onApprove ?? onPass ?? showWithdraw) && (
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              {showWithdraw && (
                <DuncitButton variant="outlined" onClick={onWithdraw} disabled={busy}>
                  {t('changeRequest.withdraw')}
                </DuncitButton>
              )}
              {onPass && (
                <DuncitButton variant="outlined" color="error" onClick={onPass} disabled={busy}>
                  {t('changeRequest.pass')}
                </DuncitButton>
              )}
              {onApprove && (
                <DuncitButton
                  variant="contained"
                  color="success"
                  onClick={onApprove}
                  disabled={busy}
                >
                  {t('changeRequest.approve')}
                </DuncitButton>
              )}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
