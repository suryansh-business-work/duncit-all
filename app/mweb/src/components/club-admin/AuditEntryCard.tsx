import type { ReactNode } from 'react';
import { Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import { podAuditSourceLabel } from '@duncit/utils';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';
import { AuditActionChip, AuditRiskChip } from './AuditChips';
import type { AuditEntry } from './audit-entry';

interface SurfaceProps {
  onOpen?: () => void;
  children: ReactNode;
}

/** A real button when tapping opens the entry's detail; plain content otherwise. */
function CardSurface({ onOpen, children }: Readonly<SurfaceProps>) {
  if (!onOpen) return <>{children}</>;
  return <CardActionArea onClick={onOpen}>{children}</CardActionArea>;
}

interface Props {
  entry: AuditEntry;
  /** The headline — the pod's name on the monitoring page. Inside a pod's own
   * activity dialog it is omitted and the actor takes its place. */
  title?: string;
  /** Tapping the card — the monitoring page opens the entry's detail. */
  onOpen?: () => void;
  /** Rendered under the summary — the activity dialog puts the change list here. */
  children?: ReactNode;
}

/**
 * One entry of the AI-monitored trail: what happened, to what, by whom, when,
 * and how risky the monitor judged it. The monitoring page and the per-pod
 * activity dialog both draw this card, so the two cannot drift (rule 40).
 */
export default function AuditEntryCard({ entry, title, onOpen, children }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const actor = entry.actor_name || t('clubAdmin.monitoring.unknownActor');
  const meta = [actor, podAuditSourceLabel(entry.source, t), formatDateTime(entry.created_at)].join(
    ' · ',
  );

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardSurface onOpen={onOpen}>
        <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
          <Stack spacing={0.75}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <AuditActionChip action={entry.action} />
              <Typography variant="subtitle2" noWrap sx={{ flex: 1, fontWeight: 700 }}>
                {title ?? actor}
              </Typography>
              <AuditRiskChip risk={entry.ai_risk} />
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {meta}
            </Typography>
            {entry.ai_summary && (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                {t('clubAdmin.pods.aiSummary', { vars: { summary: entry.ai_summary } })}
              </Typography>
            )}
            {children}
          </Stack>
        </CardContent>
      </CardSurface>
    </Card>
  );
}
