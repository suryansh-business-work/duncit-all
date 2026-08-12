import { useMemo } from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import type { SvgIconComponent } from '@mui/icons-material';
import { DuncitTable, EM_DASH, type DuncitColumn } from '@duncit/table';
import { staticTableFetch, type PaymentArtifact } from './queries';

type ArtifactState = 'CREATED' | 'NOT_APPLICABLE' | 'MISSING';

interface ArtifactStateStyle {
  label: string;
  color: string;
  Icon: SvgIconComponent;
}

// Colour is never the only signal: each state pairs its icon with the label
// that names it, so the table reads the same without colour perception.
const ARTIFACT_STATES: Record<ArtifactState, ArtifactStateStyle> = {
  CREATED: { label: 'Created', color: 'success.main', Icon: CheckCircleIcon },
  NOT_APPLICABLE: { label: 'Not applicable', color: 'text.disabled', Icon: RemoveCircleOutlineIcon },
  MISSING: { label: 'Missing', color: 'error.main', Icon: ErrorOutlineIcon },
};

/** `created` is the server reading the document back, so it outranks the
 * not-applicable hint: anything neither created nor excused is genuinely lost. */
function artifactState(artifact: PaymentArtifact): ArtifactState {
  if (artifact.created) return 'CREATED';
  if (artifact.not_applicable) return 'NOT_APPLICABLE';
  return 'MISSING';
}

const getArtifactRowId = (artifact: PaymentArtifact) => artifact.key;

const artifactSearchText = (artifact: PaymentArtifact) =>
  [artifact.label, artifact.key, ...artifact.refs].join(' ');

const renderStatus = (artifact: PaymentArtifact) => {
  const { label, color, Icon } = ARTIFACT_STATES[artifactState(artifact)];
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" component="span">
      <Icon fontSize="small" sx={{ color }} />
      <Typography variant="body2" component="span">
        {label}
      </Typography>
    </Stack>
  );
};

const renderRefs = (artifact: PaymentArtifact) => {
  if (artifact.refs.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" component="span">
        {EM_DASH}
      </Typography>
    );
  }
  return (
    <Stack component="span" sx={{ lineHeight: 1.3 }}>
      <Typography variant="caption" component="span" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {artifact.refs.join(', ')}
      </Typography>
      {artifact.count > 1 && (
        <Typography variant="caption" color="text.secondary" component="span">
          {artifact.count} records
        </Typography>
      )}
    </Stack>
  );
};

const ARTIFACT_COLUMNS: DuncitColumn<PaymentArtifact>[] = [
  { field: 'label', headerName: 'Item', sortable: false, flex: 1, minWidth: 200 },
  {
    field: 'created',
    headerName: 'Status',
    sortable: false,
    width: 170,
    cellRenderer: renderStatus,
    valueGetter: (artifact) => ARTIFACT_STATES[artifactState(artifact)].label,
  },
  {
    field: 'refs',
    headerName: 'Reference',
    sortable: false,
    flex: 1.4,
    minWidth: 220,
    cellRenderer: renderRefs,
    valueGetter: (artifact) => artifact.refs.join(', '),
  },
];

/**
 * What checkout was supposed to create, each row verified by reading the
 * document back from the database rather than trusting the pipeline's own log.
 */
export default function ArtifactsTable({ artifacts }: Readonly<{ artifacts: PaymentArtifact[] }>) {
  const fetchRows = useMemo(() => staticTableFetch(artifacts, artifactSearchText), [artifacts]);

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, width: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700}>
          What checkout created
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
          Each row is verified against the database, not the pipeline log.
        </Typography>
        <DuncitTable<PaymentArtifact>
          tableId="finance-payment-artifacts"
          columns={ARTIFACT_COLUMNS}
          fetchRows={fetchRows}
          getRowId={getArtifactRowId}
          emptyText="Nothing was recorded for this payment."
          searchPlaceholder="Search item or reference"
        />
      </CardContent>
    </Card>
  );
}
