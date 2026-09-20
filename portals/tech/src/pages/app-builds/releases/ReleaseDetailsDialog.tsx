import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import ReleaseIssueFacts from './ReleaseIssueFacts';
import ReleaseAdvice from './ReleaseAdvice';
import { StatusChip, STATUS_KEY } from './releaseColumns';
import { ReviewerMessageForm } from './reviewer-message';
import type { ReleaseActions } from './useReleaseActions';
import { humanState, isOpen, type StoreReleaseIssue, type StoreReleaseRow } from './queries';

interface Props {
  row: StoreReleaseRow | null;
  storeUrl: string;
  actions: ReleaseActions;
  onClose: () => void;
  onLogRejection: (row: StoreReleaseRow) => void;
}

/** What a store state means, in a sentence — literal keys so the localization gate can read them. */
const MEANING_KEY: Record<string, string> = {
  REJECTED: 'tech.appBuilds.releaseMeaningRejected',
  METADATA_REJECTED: 'tech.appBuilds.releaseMeaningMetadataRejected',
  INVALID_BINARY: 'tech.appBuilds.releaseMeaningInvalidBinary',
  DEVELOPER_REJECTED: 'tech.appBuilds.releaseMeaningDeveloperRejected',
  PENDING_DEVELOPER_RELEASE: 'tech.appBuilds.releaseMeaningPendingDeveloperRelease',
  MANUAL: 'tech.appBuilds.releaseMeaningManual',
};

type Severity = 'error' | 'success' | 'info';

function issueSeverity(issue: StoreReleaseIssue): Severity {
  if (!isOpen(issue)) return 'info';
  return issue.kind === 'REJECTION' ? 'error' : 'success';
}

/** The issue's headline: what the store's state means, or that it is over. */
function IssueBanner({ issue }: Readonly<{ issue: StoreReleaseIssue }>) {
  const { t } = useTranslation();
  const meaningKey = MEANING_KEY[issue.state];
  const meaning = meaningKey
    ? t(meaningKey)
    : t('tech.appBuilds.releaseMeaningOther', { vars: { state: humanState(issue.state) } });
  return (
    <Alert severity={issueSeverity(issue)} data-testid="release-issue-banner">
      <Typography variant="subtitle2">{humanState(issue.state)}</Typography>
      {meaning}
    </Alert>
  );
}

/**
 * One release, the whole story: what the store shows, what this server
 * recorded, the reviewer's words, OpenAI's advice — and the buttons that
 * answer it: submit the latest build, or close the issue by hand.
 */
export default function ReleaseDetailsDialog({ row, storeUrl, actions, onClose, onLogRejection }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!row) return null;
  const { issue } = row;
  const open = isOpen(issue);

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{t('tech.appBuilds.releaseDialogTitle', { vars: { version: row.version || '—', build: row.build_number || '—' } })}</span>
          <StatusChip row={row} label={t(STATUS_KEY[row.status])} />
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {issue && <IssueBanner issue={issue} />}
          <ReleaseIssueFacts row={row} />
          {issue && (
            <>
              <Divider />
              <ReviewerMessageForm
                initial={issue.reviewer_message}
                busy={actions.busy.savingMessage}
                onSubmit={(values) => actions.saveReviewerMessage(issue, values.message)}
              />
              <Divider />
              <ReleaseAdvice advice={issue.advice} />
            </>
          )}
          {!issue && (
            <Alert
              severity="info"
              action={
                <DuncitButton size="small" color="inherit" onClick={() => onLogRejection(row)}>
                  {t('tech.appBuilds.logRejectionAction')}
                </DuncitButton>
              }
            >
              {t('tech.appBuilds.releaseNoIssue')}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {storeUrl && (
          <DuncitButton component="a" href={storeUrl} target="_blank" rel="noreferrer" startIcon={<OpenInNewIcon />} sx={{ mr: 'auto' }}>
            {t('tech.appBuilds.releaseOpenStore')}
          </DuncitButton>
        )}
        {open && (
          <DuncitButton variant="outlined" loading={actions.busy.resolving} onClick={() => actions.resolve(issue)}>
            {t('tech.appBuilds.resolveIssueAction')}
          </DuncitButton>
        )}
        {open && (
          <DuncitButton variant="contained" loading={actions.busy.submitting} onClick={actions.submitLatest}>
            {t('tech.appBuilds.submitLatestAction')}
          </DuncitButton>
        )}
        <DuncitButton onClick={onClose}>{t('tech.appBuilds.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
