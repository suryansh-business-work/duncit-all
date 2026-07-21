import { useMemo, useRef } from 'react';
import { useApolloClient } from '@apollo/client';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  FormControlLabel,
  Link,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import {
  MEDIA_SCAN_LOGS_TABLE,
  SCAN_RISK_COLORS,
  SCAN_RISK_OPTIONS,
  type MediaScanLog,
  type UploadSettings,
} from './queries';

const getRowId = (row: MediaScanLog) => row.id;

const renderRisk = (row: MediaScanLog) => (
  <Chip size="small" label={row.risk} color={SCAN_RISK_COLORS[row.risk]} variant="outlined" />
);

const renderFile = (row: MediaScanLog) => (
  <Link href={row.url} target="_blank" rel="noopener" underline="hover">
    {row.file_name || row.url}
  </Link>
);

interface Props {
  settings: UploadSettings;
  saving: boolean;
  onSave: (input: Record<string, unknown>) => void;
}

/** Accordion 5 — AI image monitoring toggle + the risk-scored scan log of
 * every uploaded image (images only — videos are not AI-reviewed). */
export default function AiMonitoringAccordion({ settings, saving, onSave }: Readonly<Props>) {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const fetchRows = useApolloTableFetch<MediaScanLog>(client, MEDIA_SCAN_LOGS_TABLE, 'mediaScanLogsTable');

  const columns = useMemo<DuncitColumn<MediaScanLog>[]>(
    () => [
      {
        field: 'created_at',
        headerName: 'When',
        width: 170,
        filter: { type: 'date' },
        valueGetter: (row) => new Date(row.created_at).toLocaleString(),
      },
      {
        field: 'file_name',
        headerName: 'Image',
        flex: 1,
        minWidth: 180,
        cellRenderer: renderFile,
        valueGetter: (row) => row.file_name || row.url,
      },
      { field: 'folder', headerName: 'Folder', width: 140, valueGetter: (row) => row.folder || '—' },
      {
        field: 'surface',
        headerName: 'Surface',
        width: 130,
        valueGetter: (row) => row.surface || '—',
      },
      {
        field: 'risk',
        headerName: 'AI Risk',
        width: 120,
        filter: { type: 'select', options: SCAN_RISK_OPTIONS },
        cellRenderer: renderRisk,
        valueGetter: (row) => row.risk,
      },
      {
        field: 'summary',
        headerName: 'AI Summary',
        sortable: false,
        flex: 1.4,
        minWidth: 220,
        valueGetter: (row) => row.summary || '—',
      },
    ],
    [],
  );

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography fontWeight={700}>AI image monitoring</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.ai_image_monitoring_enabled}
                disabled={saving}
                onChange={(e) => onSave({ ai_image_monitoring_enabled: e.target.checked })}
              />
            }
            label="Review every uploaded image with AI (risk-scored, images only)"
          />
          <DuncitTable<MediaScanLog>
            tableId="media-scan-logs"
            columns={columns}
            fetchRows={fetchRows}
            getRowId={getRowId}
            emptyText="No images scanned yet."
            searchPlaceholder="Search file, folder or AI summary"
            defaultSort={{ field: 'created_at', dir: 'desc' }}
            refetchRef={refetchRef}
          />
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
