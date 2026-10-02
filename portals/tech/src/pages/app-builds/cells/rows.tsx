import { Box, Chip, Tooltip, Typography } from '@mui/material';
import type { AppBuildRow } from '../queries';

export const renderBuild = (row: AppBuildRow) => (
  <Box>
    <Typography variant="body2" noWrap title={row.build_name || row.build_no}>
      {row.build_name || '—'}
    </Typography>
    <Typography variant="caption" sx={{
      color: "text.secondary"
    }}>
      {row.build_no}
    </Typography>
  </Box>
);

export const renderCommit = (row: AppBuildRow) => {
  const subject = row.commits[0]?.subject ?? '';
  return (
    <Box>
      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
        {row.commit_sha ? row.commit_sha.slice(0, 7) : '—'}
      </Typography>
      {subject && (
        <Typography variant="caption" noWrap title={subject} sx={{
          color: "text.secondary"
        }}>
          {subject}
        </Typography>
      )}
    </Box>
  );
};

/**
 * Which stack the built app talks to. Staging is called out in colour because
 * it is baked in at compile time — an installed build cannot be pointed
 * somewhere else, so handing a tester the wrong one wastes the whole build.
 */
export const makeRenderEnv = (labels: Record<string, string>) => {
  const renderEnv = (row: AppBuildRow) => (
    <Chip
      size="small"
      variant="outlined"
      color={row.app_env === 'STAGING' ? 'warning' : 'default'}
      label={labels[row.app_env] ?? row.app_env}
    />
  );
  return renderEnv;
};

/** Who started it, and whether they pressed a button or merged something. */
export const makeRenderTriggeredBy = (labels: Record<string, string>) => {
  const renderTriggeredBy = (row: AppBuildRow) => (
    <Box>
      <Typography variant="body2" noWrap title={row.triggered_by}>
        {row.triggered_by || '—'}
      </Typography>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {labels[row.trigger_source] ?? row.trigger_source}
      </Typography>
    </Box>
  );
  return renderTriggeredBy;
};

/** Slack outcome: posted / skipped-with-reason. The row is the record either way. */
export const makeRenderSlack = (postedLabel: string, skippedLabel: string) => {
  const renderSlack = (row: AppBuildRow) => {
    if (row.slack_ts) {
      return <Chip size="small" color="success" variant="outlined" label={postedLabel} />;
    }
    return (
      <Tooltip title={row.slack_error ?? ''}>
        <Chip size="small" variant="outlined" label={skippedLabel} />
      </Tooltip>
    );
  };
  return renderSlack;
};
