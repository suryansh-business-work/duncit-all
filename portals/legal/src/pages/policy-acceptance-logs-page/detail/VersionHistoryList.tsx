import { Alert, Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import type { PolicyVersionRow } from '../../../graphql/policyAcceptance';

interface RowProps {
  version: PolicyVersionRow;
  /** True for the wording this acceptance is a record of. */
  isAccepted: boolean;
  editedBy: string;
  when: string;
  onRead: (version: PolicyVersionRow) => void;
  readLabel: string;
  currentLabel: string;
  acceptedLabel: string;
  versionLabel: string;
}

/** One wording in the trail. Hoisted so it is not redefined every render. */
function VersionRow({
  version,
  isAccepted,
  editedBy,
  when,
  onRead,
  readLabel,
  currentLabel,
  acceptedLabel,
  versionLabel,
}: Readonly<RowProps>) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 1.5, borderColor: isAccepted ? 'primary.main' : 'divider' }}
    >
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{
          alignItems: "center",
          flexWrap: "wrap"
        }}>
        <Typography variant="body2" sx={{
          fontWeight: 800
        }}>
          {versionLabel}
        </Typography>
        {version.is_current && <Chip size="small" color="success" label={currentLabel} />}
        {isAccepted && <Chip size="small" color="primary" label={acceptedLabel} />}
        <Box sx={{ flex: 1 }} />
        <DuncitButton size="small" onClick={() => onRead(version)}>
          {readLabel}
        </DuncitButton>
      </Stack>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          display: "block"
        }}>
        {version.title}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          display: "block"
        }}>
        {when} · {editedBy}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontFamily: 'monospace',
          wordBreak: 'break-all'
        }}>
        {version.content_hash}
      </Typography>
    </Paper>
  );
}

interface Props {
  versions: PolicyVersionRow[];
  /** The fingerprint on the acceptance being inspected. */
  acceptedHash: string;
  /** True when no stored version matches that fingerprint. */
  wordingMissing: boolean;
  formatDateTime: (value: string) => string;
  onRead: (version: PolicyVersionRow) => void;
}

/**
 * Every wording the policy has had, newest first, with the accepted one marked.
 *
 * Newest first because the question is almost always "what has changed since",
 * and the row an auditor came for is highlighted rather than sorted to the top:
 * where it sits in the sequence is part of the answer.
 */
export default function VersionHistoryList({
  versions,
  acceptedHash,
  wordingMissing,
  formatDateTime,
  onRead,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const newestFirst = [...versions].sort((a, b) => b.version_no - a.version_no);

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" sx={{
        fontWeight: 800
      }}>
        {t('legalAcceptanceLogs.detail.sectionVersions')}
      </Typography>
      {wordingMissing && (
        <Alert severity="info">{t('legalAcceptanceLogs.detail.versionMissing')}</Alert>
      )}
      {newestFirst.length === 0 && (
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('legalAcceptanceLogs.detail.noVersions')}
        </Typography>
      )}
      {newestFirst.map((version) => (
        <VersionRow
          key={version.id}
          version={version}
          isAccepted={version.content_hash === acceptedHash}
          editedBy={
            version.updated_by_name
              ? t('legalAcceptanceLogs.detail.versionBy', {
                  vars: { name: version.updated_by_name },
                })
              : t('legalAcceptanceLogs.detail.versionUnknownEditor')
          }
          when={version.created_at ? formatDateTime(version.created_at) : ''}
          onRead={onRead}
          readLabel={t('legalAcceptanceLogs.detail.readWording')}
          currentLabel={t('legalAcceptanceLogs.detail.versionCurrent')}
          acceptedLabel={t('legalAcceptanceLogs.detail.versionAccepted')}
          versionLabel={t('legalAcceptanceLogs.detail.versionLabel', {
            vars: { no: String(version.version_no) },
          })}
        />
      ))}
    </Stack>
  );
}
