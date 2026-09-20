import { Box } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { formatDateTime } from '@duncit/app-settings';
import { DetailField } from '../../../components/DetailField';
import { humanState, type StoreReleaseIssue, type StoreReleaseRow } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

const when = (value: string | null) => (value ? formatDateTime(value) : '—');

/** `STATE_CHANGED:X`, `VERSION_GONE` or `BY:who` — the server's reason, in words. */
function resolvedLabel(issue: StoreReleaseIssue, t: Translate): string {
  if (!issue.resolved_at) return t('tech.appBuilds.releaseIssueOpen');
  const at = formatDateTime(issue.resolved_at);
  if (issue.resolved_reason.startsWith('STATE_CHANGED:')) {
    const state = humanState(issue.resolved_reason.slice('STATE_CHANGED:'.length));
    return t('tech.appBuilds.releaseResolvedStateChanged', { vars: { state, when: at } });
  }
  if (issue.resolved_reason.startsWith('BY:')) {
    return t('tech.appBuilds.releaseResolvedBy', { vars: { by: issue.resolved_reason.slice(3), when: at } });
  }
  return t('tech.appBuilds.releaseResolvedGone', { vars: { when: at } });
}

function noticesLabel(issue: StoreReleaseIssue, t: Translate): string {
  if (issue.notify_error) return t('tech.appBuilds.releaseNoticeFailed', { vars: { error: issue.notify_error } });
  if (!issue.notified_at) return t('tech.appBuilds.releaseNoticePending');
  const sent = t('tech.appBuilds.releaseNoticeSent', { vars: { when: formatDateTime(issue.notified_at) } });
  if (issue.reminder_count === 0) return sent;
  return `${sent} · ${t('tech.appBuilds.releaseReminders', {
    vars: { times: String(issue.reminder_count), when: when(issue.last_reminded_at) },
  })}`;
}

/** The issue's own facts: what kind, who saw it, whether it is over, what was sent, what was pushed. */
function IssueFacts({ issue }: Readonly<{ issue: StoreReleaseIssue }>) {
  const { t } = useTranslation();
  const kind = t(issue.kind === 'REJECTION' ? 'tech.appBuilds.releaseIssueRejection' : 'tech.appBuilds.releaseIssueAwaiting');
  const source =
    issue.source === 'MANUAL'
      ? t('tech.appBuilds.releaseSourceManual', { vars: { by: issue.detected_by } })
      : t('tech.appBuilds.releaseSourceStore');
  const resubmitted = issue.resubmitted_build_no
    ? t('tech.appBuilds.releaseResubmittedLabel', {
        vars: { build: issue.resubmitted_build_no, by: issue.resubmitted_by, when: when(issue.resubmitted_at) },
      })
    : '—';
  return (
    <>
      <DetailField label={t('tech.appBuilds.releaseFactIssue')} value={`${kind} · ${source}`} />
      <DetailField label={t('tech.appBuilds.releaseFactFirstSeen')} value={formatDateTime(issue.detected_at)} />
      <DetailField label={t('tech.appBuilds.releaseFactResolved')} value={resolvedLabel(issue, t)} />
      <DetailField label={t('tech.appBuilds.releaseFactNotices')} value={noticesLabel(issue, t)} />
      <DetailField label={t('tech.appBuilds.releaseFactResubmitted')} value={resubmitted} />
    </>
  );
}

/** Everything the store and this server know about one release, as labelled pairs. */
export default function ReleaseIssueFacts({ row }: Readonly<{ row: StoreReleaseRow }>) {
  const { t } = useTranslation();
  const track = row.rollout_pct === null ? row.track : `${row.track} · ${row.rollout_pct}%`;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
      <DetailField label={t('tech.appBuilds.releaseColStoreState')} value={humanState(row.state)} />
      {row.store === 'APP_STORE' && (
        <DetailField label={t('tech.appBuilds.releaseColReview')} value={row.review_state ? humanState(row.review_state) : '—'} />
      )}
      {row.store === 'GOOGLE_PLAY' && <DetailField label={t('tech.appBuilds.releaseColTrack')} value={track} />}
      <DetailField label={t('tech.appBuilds.releaseColCreated')} value={when(row.created_at)} />
      {row.store === 'APP_STORE' && <DetailField label={t('tech.appBuilds.releaseColSubmitted')} value={when(row.submitted_at)} />}
      <DetailField label={t('tech.appBuilds.releaseColBuildRow')} value={row.build_no} mono />
      {row.issue && <IssueFacts issue={row.issue} />}
    </Box>
  );
}
