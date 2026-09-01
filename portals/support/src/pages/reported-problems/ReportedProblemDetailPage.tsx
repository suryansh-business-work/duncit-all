import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { BackButton, InfoRow, QueryGuard, StatusChip } from '@duncit/ui';
import { useDateFormat } from '@duncit/app-settings';
import {
  REPORTED_PROBLEM,
  SET_REPORT_STATUS,
  type FeedbackReportRow,
} from '../../graphql/reported-problems';
import { useTranslation } from '@duncit/shell';

const STATUS_COLORS = {
  OPEN: 'warning',
  IN_REVIEW: 'info',
  RESOLVED: 'success',
  CLOSED: 'default',
} as const;

const STATUSES = Object.keys(STATUS_COLORS);

/** One reported problem in full, with its screenshots and triage state. */
export default function ReportedProblemDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { formatDateTime } = useDateFormat();
  const { data, loading, error, refetch } = useQuery<{ reportedProblem: FeedbackReportRow | null }>(
    REPORTED_PROBLEM,
    { variables: { id }, skip: !id, fetchPolicy: 'cache-and-network' }
  );
  const [setStatus, statusState] = useMutation<any>(SET_REPORT_STATUS);
  const report = data?.reportedProblem;

  return (
    <QueryGuard
      loading={loading && !report}
      error={error}
      errorText={error?.message}
      notFound={!report}
      notFoundText="Report not found."
      notFoundSeverity="warning"
    >
      {/* QueryGuard only renders this once `notFound` is false, but it cannot
          say so in the type — bind the narrowed value once here rather than
          optional-chaining a report that is guaranteed to exist. */}
      {() => {
        const r = report as FeedbackReportRow;
        return (
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1.5} sx={{
              alignItems: "center"
            }}>
              <BackButton onClick={() => navigate('/reported-problems')}>{t('support.problems.title')}</BackButton>
              <Typography variant="h5" sx={{
                fontWeight: 900
              }}>
                {r.report_no}
              </Typography>
              <StatusChip status={r.status} colorMap={STATUS_COLORS} />
            </Stack>

            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} sx={{
                    alignItems: "center"
                  }}>
                    <Chip size="small" label={r.category} />
                    <Chip size="small" variant="outlined" label={r.platform} />
                    {r.app_version && (
                      <Chip size="small" variant="outlined" label={`v${r.app_version}`} />
                    )}
                  </Stack>

                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {r.message}
                  </Typography>

                  {r.media_urls.length > 0 && (
                    <>
                      <Divider />
                      <Typography variant="subtitle2">{t('support.problems.screenshots')}</Typography>
                      <Stack direction="row" spacing={1.5} useFlexGap sx={{
                        flexWrap: "wrap"
                      }}>
                        {r.media_urls.map((url) => (
                          <Box
                            key={url}
                            component="a"
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            sx={{ display: 'block', width: 160, height: 160, borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'divider' }}
                          >
                            <Box
                              component="img"
                              src={url}
                              alt={t('support.problems.reportedScreenshot')}
                              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </Box>
                        ))}
                      </Stack>
                    </>
                  )}

                  <Divider />
                  {/* The reporter AS THEY WERE when they reported it. Support
                      reads these days later, by which time the account may have
                      changed phone, city or roles — so these are the stored
                      snapshot, not a live lookup. */}
                  <Typography variant="subtitle2">{t('support.problems.reporter')}</Typography>
                  <InfoRow label={t('shell.common.name')} value={r.user_name || t('support.problems.unknownReporter')} />
                  <InfoRow label={t('shell.common.email')} value={r.user_email || '—'} />
                  <InfoRow label={t('shell.common.phone')} value={r.reporter_phone || '—'} />
                  <InfoRow label={t('support.problems.city')} value={r.reporter_city || '—'} />
                  <InfoRow label={t('support.problems.language')} value={r.reporter_locale || '—'} />
                  <InfoRow
                    label={t('support.problems.roles')}
                    value={r.reporter_roles.length > 0 ? r.reporter_roles.join(', ') : '—'}
                  />
                  {/* The id, not a link: Support has no user directory of its own
                      (that lives in the admin portal), and a button that goes
                      nowhere is worse than the id you can search with. Empty for
                      a report that arrived by email from an address with no
                      account — there is genuinely nobody to look up. */}
                  <InfoRow label={t('support.problems.userId')} value={r.user_id || t('support.problems.noAccount')} />

                  <Divider />
                  <Typography variant="subtitle2">{t('support.problems.whereItHappened')}</Typography>
                  <InfoRow label={t('support.problems.surface')} value={r.platform || '—'} />
                  <InfoRow label={t('support.problems.appVersion')} value={r.app_version || '—'} />
                  <InfoRow label={t('support.problems.deviceOs')} value={r.device_os || '—'} />
                  <InfoRow label={t('support.problems.modelScreen')} value={r.device_model || '—'} />
                  <InfoRow label={t('support.problems.screen')} value={r.source_screen || '—'} />
                  <InfoRow label={t('support.problems.reportedAt')} value={formatDateTime(r.created_at)} />
                  {/* Surfaced rather than hidden: an un-announced report is one
                      nobody was told about, not one that failed to save. */}
                  {r.slack_error && (
                    <Alert severity="warning">
                      Not announced on Slack — {r.slack_error}. The report itself is saved.
                    </Alert>
                  )}

                  <TextField
                    select
                    label={t('shell.common.status')}
                    size="small"
                    value={r.status}
                    disabled={statusState.loading}
                    onChange={(event) => {
                      setStatus({ variables: { id: r.id, status: event.target.value } })
                        .then(() => refetch())
                        .catch(() => undefined);
                    }}
                    sx={{ maxWidth: 240 }}
                  >
                    {STATUSES.map((value) => (
                      <MenuItem key={value} value={value}>
                        {value.replaceAll('_', ' ')}
                      </MenuItem>
                    ))}
                  </TextField>
                  {statusState.error && <Alert severity="error">{statusState.error.message}</Alert>}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        );
      }}
    </QueryGuard>
  );
}
