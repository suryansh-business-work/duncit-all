import { Box, Tooltip } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import type { AppBuildArtifact, AppBuildRow } from '../queries';

export interface LinkLabels {
  /** Takes the artifact kind, e.g. "Download APK". */
  download: (kind: string) => string;
  run: string;
  delete: string;
  /** Shown in place of a download icon when an artifact never stored. */
  noArtifact: string;
}

/**
 * One icon per file the build produced — an Android build offers its APK and
 * its AAB from the same row. An artifact that never stored shows WHY rather
 * than an empty gap, because a missing download is the thing somebody has to
 * act on and it cannot look the same as a build that simply failed.
 */
const ArtifactLink = ({
  artifact,
  labels,
}: Readonly<{ artifact: AppBuildArtifact; labels: LinkLabels }>) => {
  if (!artifact.url) {
    return (
      <Tooltip title={artifact.error || labels.noArtifact}>
        {/* Exposed as an image so the tooltip's name reaches a screen reader. */}
        <ErrorOutlineIcon fontSize="small" color="warning" role="img" aria-hidden={false} />
      </Tooltip>
    );
  }
  const label = labels.download(artifact.kind);
  return (
    <Tooltip title={label}>
      <DuncitIconButton size="small" component="a" href={artifact.url} aria-label={label}>
        <DownloadIcon fontSize="small" />
      </DuncitIconButton>
    </Tooltip>
  );
};

/** Icon links stop propagation so opening them never also opens the details dialog. */
export const makeRenderLinks = (labels: LinkLabels, onDelete: (row: AppBuildRow) => void) => {
  const renderLinks = (row: AppBuildRow) => (
    <Box role="presentation" onClick={(e) => e.stopPropagation()}>
      {row.artifacts.map((a) => (
        <ArtifactLink key={a.kind} artifact={a} labels={labels} />
      ))}
      {row.workflow_run_url && (
        <Tooltip title={labels.run}>
          <DuncitIconButton
            size="small"
            component="a"
            href={row.workflow_run_url}
            target="_blank"
            rel="noreferrer"
            aria-label={labels.run}
          >
            <OpenInNewIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      )}
      <Tooltip title={labels.delete}>
        <DuncitIconButton size="small" onClick={() => onDelete(row)} aria-label={labels.delete}>
          <DeleteOutlineIcon fontSize="small" color="error" />
        </DuncitIconButton>
      </Tooltip>
    </Box>
  );
  return renderLinks;
};
