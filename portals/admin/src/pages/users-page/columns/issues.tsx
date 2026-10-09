import { Chip, Stack, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import type { UserDataIssue } from '@duncit/gql-types';
import type { UserRow } from '../queries';

/**
 * The words for each contact-data issue the server flags. Written out
 * literally, once, so the localization gate can find every key.
 */
const ISSUE_COPY: Record<UserDataIssue, string> = {
  MISSING_NAME: 'admin.users.issueMissingName',
  MISSING_EMAIL: 'admin.users.issueMissingEmail',
  MISSING_PHONE: 'admin.users.issueMissingPhone',
  DUPLICATE_EMAIL: 'admin.users.issueDuplicateEmail',
  DUPLICATE_PHONE: 'admin.users.issueDuplicatePhone',
  CONTACT_MISMATCH: 'admin.users.issueContactMismatch',
};

type Translate = (key: string) => string;

/** True when the row has anything to fix — it is tinted red. */
export const hasDataIssues = (u: UserRow) => (u.data_issues?.length ?? 0) > 0;

/** The Data Issues filter: rows with ANY of the picked issues. */
export const issueOptions = (t: Translate) =>
  (Object.keys(ISSUE_COPY) as UserDataIssue[]).map((issue) => ({ value: issue, label: t(ISSUE_COPY[issue]) }));

/** The issues as text, for the grid's value (export, copy). */
export const issuesValue = (u: UserRow, t: Translate) => (u.data_issues ?? []).map((i) => t(ISSUE_COPY[i])).join(', ');

/** One red chip per issue; the chips carry the words, so the red tint is never the only cue (WCAG 1.4.1). */
export const renderIssues = (u: UserRow, t: Translate) => {
  const issues = u.data_issues ?? [];
  if (issues.length === 0) {
    return (
      <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
        {t('admin.users.noIssues')}
      </Typography>
    );
  }
  return (
    <Stack direction="row" spacing={0.5} component="span" sx={{ overflow: 'hidden' }}>
      {issues.map((issue) => (
        <Chip
          key={issue}
          icon={<ErrorOutlineIcon />}
          label={t(ISSUE_COPY[issue])}
          size="small"
          color="error"
          variant="outlined"
          data-testid={`user-issue-${issue}`}
        />
      ))}
    </Stack>
  );
};
