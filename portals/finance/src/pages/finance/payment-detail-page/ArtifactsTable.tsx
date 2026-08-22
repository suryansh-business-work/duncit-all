import { useMemo } from 'react';
import { Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import type { SvgIconComponent } from '@mui/icons-material';
import { DuncitTable, EM_DASH, type DuncitColumn } from '@duncit/table';
import { useTranslation, type Translator } from '@duncit/app-settings';
import RetryButton from './RetryButton';
import { useTableRefresh } from './useTableRefresh';
import { staticTableFetch, type PaymentArtifact } from './queries';

type ArtifactState = 'CREATED' | 'NOT_APPLICABLE' | 'MISSING';

interface ArtifactStateStyle {
  labelKey: string;
  color: string;
  Icon: SvgIconComponent;
}

// Colour is never the only signal: each state pairs its icon with the label
// that names it, so the table reads the same without colour perception.
const ARTIFACT_STATES: Record<ArtifactState, ArtifactStateStyle> = {
  CREATED: { labelKey: 'finance.payment.artifactCreated', color: 'success.main', Icon: CheckCircleIcon },
  NOT_APPLICABLE: { labelKey: 'finance.payment.artifactNotApplicable', color: 'text.disabled', Icon: RemoveCircleOutlineIcon },
  MISSING: { labelKey: 'finance.payment.artifactMissing', color: 'error.main', Icon: ErrorOutlineIcon },
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

/** The state cell. Takes `t` rather than calling a hook, so it stays a plain
 * module-scope renderer (a component defined inside a component would remount
 * every row on each render). */
const renderStatus = (artifact: PaymentArtifact, t: Translator['t']) => {
  const { labelKey, color, Icon } = ARTIFACT_STATES[artifactState(artifact)];
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" component="span">
      <Icon fontSize="small" sx={{ color }} />
      <Typography variant="body2" component="span">
        {t(labelKey)}
      </Typography>
    </Stack>
  );
};

const renderRefs = (artifact: PaymentArtifact, t: Translator['t']) => {
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
          {t('finance.payment.recordCount', { vars: { n: artifact.count } })}
        </Typography>
      )}
    </Stack>
  );
};

interface RetryCell {
  busyKey: string | null;
  onRetry: (stepKey: string) => void;
}

/** Columns depend on the active catalogue, so they are built per translator
 * rather than frozen at module load — the header text has to change with it. */
const artifactColumns = (
  t: Translator['t'],
  retry: RetryCell | null,
): DuncitColumn<PaymentArtifact>[] => {
  const columns: DuncitColumn<PaymentArtifact>[] = [
    { field: 'label', headerName: t('finance.payment.artifactItem'), sortable: false, flex: 1, minWidth: 200 },
    {
      field: 'created',
      headerName: t('finance.payment.artifactStatus'),
      sortable: false,
      width: 170,
      cellRenderer: (artifact) => renderStatus(artifact, t),
      valueGetter: (artifact) => t(ARTIFACT_STATES[artifactState(artifact)].labelKey),
    },
    {
      field: 'refs',
      headerName: t('finance.payment.artifactReference'),
      sortable: false,
      flex: 1.4,
      minWidth: 220,
      cellRenderer: (artifact) => renderRefs(artifact, t),
      valueGetter: (artifact) => artifact.refs.join(', '),
    },
  ];
  if (!retry) return columns;
  columns.push({
    field: 'retry_key',
    headerName: t('finance.payment.artifactAction'),
    sortable: false,
    width: 130,
    cellRenderer: (artifact) =>
      artifact.retry_key ? (
        <RetryButton
          stepKey={artifact.retry_key}
          label={artifact.label}
          busyKey={retry.busyKey}
          onRetry={retry.onRetry}
        />
      ) : null,
    valueGetter: (artifact) => artifact.retry_key ?? '',
  });
  return columns;
};

interface Props {
  artifacts: PaymentArtifact[];
  /** Unique per section — DuncitTable persists column prefs against it. */
  tableId: string;
  busyKey: string | null;
  onRetry: (stepKey: string) => void;
}

/**
 * What checkout was supposed to create, each row verified by reading the
 * document back from the database rather than trusting the pipeline's own log.
 * The action column appears only when something here can actually be re-run.
 */
export default function ArtifactsTable({ artifacts, tableId, busyKey, onRetry }: Readonly<Props>) {
  const { t } = useTranslation();
  const fetchRows = useMemo(() => staticTableFetch(artifacts, artifactSearchText), [artifacts]);
  const retryable = artifacts.some((artifact) => artifact.retry_key);
  const columns = useMemo(
    () => artifactColumns(t, retryable ? { busyKey, onRetry } : null),
    [t, retryable, busyKey, onRetry],
  );
  // A re-run rewrites these rows without touching the query the table asks
  // with, so it has to be told to read them again.
  const refetchRef = useTableRefresh(artifacts);

  return (
    <DuncitTable<PaymentArtifact>
      tableId={tableId}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getArtifactRowId}
      refetchRef={refetchRef}
      emptyText={t('finance.payment.artifactsEmpty')}
      searchPlaceholder={t('finance.payment.artifactsSearch')}
    />
  );
}
