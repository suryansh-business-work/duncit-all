import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import { DetailBlock, DetailField as Field } from '../../components/DetailField';
import { userLabel } from '../../components/telemetry-identity';
import { affectedSummary, type BugRow } from './queries';
import BugOccurrences from './BugOccurrences';
import { formatDateTime, useTranslation } from '@duncit/app-settings';

/**
 * Everything one bug knows about itself.
 *
 * Split out from the route that frames it so the detail is one description of
 * a bug rather than one per place it is shown.
 */

/** `14/08/2026, 10:12:03 · by 66a1…` — when it was resolved and by whom. */
const resolvedLine = (bug: BugRow) => {
  if (!bug.resolved_at) return '';
  const when = formatDateTime(bug.resolved_at);
  return bug.resolved_by ? `${when} · by ${bug.resolved_by}` : when;
};

/**
 * Who this bug reaches, and the last person it reached.
 *
 * The count is what decides whether it is triaged tonight or on Monday; the
 * named person is who can be asked what they were doing when it happened.
 */
function AffectedSection({ bug }: Readonly<{ bug: BugRow }>) {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
      <Field label={t('tech.bugs.affected')} value={affectedSummary(bug)} />
      <Field label={t('tech.bugs.lastUser')} value={userLabel(bug.last_user)} />
      <Field label={t('shell.common.email')} value={bug.last_user?.email ?? ''} />
      <Field label={t('shell.common.phone')} value={bug.last_user?.phone ?? ''} />
      <Field label={t('shell.nav.roles')} value={bug.last_user?.roles?.join(', ') ?? ''} />
      <Field label={t('tech.common.userId')} value={bug.last_user?.id ?? ''} mono />
      <Field label={t('tech.common.appVersion')} value={bug.last_app_version ?? ''} />
      <Field label={t('tech.bugs.lastEnvironment')} value={bug.last_environment ?? ''} />
      <Field
        label={t('tech.common.device')}
        value={[bug.last_client?.device_model, bug.last_client?.device_os_version]
          .filter(Boolean)
          .join(' · ')}
      />
      <Field
        label={t('tech.bugs.localeTimezone')}
        value={[bug.last_client?.locale, bug.last_client?.timezone].filter(Boolean).join(' · ')}
      />
      <Field label={t('tech.common.network')} value={bug.last_client?.network ?? ''} />
      <Field label={t('tech.common.ipAddress')} value={bug.last_ip ?? ''} />
      <Field label={t('tech.common.deviceId')} value={bug.last_duid ?? ''} mono />
      <Field label={t('tech.common.session')} value={bug.last_session_id ?? ''} mono />
    </Box>
  );
}

export default function BugDetailBody({ bug }: Readonly<{ bug: BugRow }>) {
  const { t } = useTranslation();
  const envRows: Array<[string, number]> = [
    ['Localhost', bug.env_counts.localhost],
    ['Staging', bug.env_counts.staging],
    ['Production', bug.env_counts.production],
  ];
  const appLine = [bug.app, bug.portal].filter(Boolean).join(' · ');

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <Field label={t('tech.bugs.error')} value={bug.error_name} />
        <Field label={t('tech.bugs.occurrences')} value={String(bug.occurrence_count)} />
        <Field label={t('tech.common.source')} value={bug.source} />
        <Field label={t('tech.common.page')} value={bug.page} />
        <Field label={t('tech.common.platform')} value={[bug.platform, bug.os].filter(Boolean).join(' · ')} />
        <Field label={t('tech.common.app')} value={appLine} />
        <Field label={t('tech.bugs.firstSeen')} value={formatDateTime(bug.first_seen_at)} />
        <Field label={t('tech.bugs.lastSeen')} value={formatDateTime(bug.last_seen_at)} />
        <Field label={t('tech.bugs.lastUrl')} value={bug.last_url ?? ''} />
        <Field label={t('tech.bugs.lastHost')} value={bug.last_host ?? ''} />
        <Field label={t('tech.bugs.trackedSince')} value={formatDateTime(bug.created_at)} />
        <Field label={t('tech.bugs.resolved')} value={resolvedLine(bug)} />
      </Box>

      <Field label={t('tech.common.message')} value={bug.message} />
      <Field label={t('tech.bugs.fingerprint')} value={bug.fingerprint} mono />

      <Box>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          Occurrences by environment
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            flexWrap: "wrap",
            mt: 0.5
          }}>
          {envRows.map(([label, count]) => (
            <Chip key={label} size="small" variant="outlined" label={`${label}: ${count}`} />
          ))}
        </Stack>
      </Box>

      <Divider />
      <Box>
        <Typography variant="subtitle2" gutterBottom sx={{
          fontWeight: 700
        }}>
          Who it hits
        </Typography>
        <AffectedSection bug={bug} />
      </Box>

      {bug.last_user_agent ? (
        <DetailBlock label={t('tech.bugs.latestUserAgent')} value={bug.last_user_agent} />
      ) : null}
      {bug.last_stack ? <DetailBlock label={t('tech.bugs.latestStackTrace')} value={bug.last_stack} /> : null}

      <BugOccurrences bugId={bug.id} />
    </Stack>
  );
}
