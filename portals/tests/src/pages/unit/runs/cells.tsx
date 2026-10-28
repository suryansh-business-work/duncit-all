import { Link, Tooltip, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitIconButton } from '@duncit/buttons';
import { EM_DASH } from '@duncit/table';
import { commitUrl, shortSha } from '../format';
import type { UnitRunRow } from '../queries';

/**
 * The runs table's custom cells, built outside the table component so the
 * grid never sees a new component type per render.
 */

export const getRunRowId = (row: UnitRunRow) => row.id;

/** The short sha, linked to the commit on GitHub when the run says which repo it ran in. */
export function renderCommit(row: UnitRunRow) {
  const href = commitUrl(row.github_run_url, row.commit_sha);
  if (!href) return <Typography variant="body2">{shortSha(row.commit_sha)}</Typography>;
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      underline="hover"
      onClick={(event) => event.stopPropagation()}
      sx={{ typography: 'body2', fontVariantNumeric: 'tabular-nums' }}
    >
      {shortSha(row.commit_sha)}
    </Link>
  );
}

/** The GitHub Actions run, opened in a new tab; a dash until the workflow has claimed the row. */
export function makeGithubCell(label: string, pending: string) {
  const renderGithub = (row: UnitRunRow) => {
    if (!row.github_run_url) {
      return (
        <Tooltip title={pending}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {EM_DASH}
          </Typography>
        </Tooltip>
      );
    }
    return (
      <Tooltip title={label}>
        <DuncitIconButton
          size="small"
          aria-label={label}
          href={row.github_run_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          <OpenInNewIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
    );
  };
  return renderGithub;
}
