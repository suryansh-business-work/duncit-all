import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from '@duncit/shell';
import { formatDateTime } from '../../server/format';
import type { CloneConnection } from '../queries';
import DataCloneConnectionForm from './data-clone-connection.form';
import type { DataCloneConnectionValues } from './data-clone-connection.types';

interface Props {
  /** Localised in the parent: a key is never composed from the role. */
  label: string;
  connection: CloneConnection;
  busy: boolean;
  onSubmit: (values: DataCloneConnectionValues) => void;
  onTest: () => void;
}

/**
 * One end of the clone. The summary is the answer an operator came for —
 * connected or not — and the body is how they change it.
 */
export default function ConnectionAccordion({
  label,
  connection,
  busy,
  onSubmit,
  onTest,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const statusLabel = connection.connected
    ? t('tech.dataClone.connected')
    : t('tech.dataClone.notConnected');

  const checkedLine = connection.lastTestedAt
    ? t('tech.dataClone.lastChecked', {
        vars: {
          when: formatDateTime(connection.lastTestedAt),
          count: connection.collectionCount,
        },
      })
    : t('tech.dataClone.neverChecked');

  return (
    <Accordion defaultExpanded={!connection.connected} disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            flex: 1,
            minWidth: 0
          }}>
          <Typography sx={{ fontWeight: 700, flex: 1, minWidth: 0 }} noWrap>
            {label}
          </Typography>
          <Chip
            size="small"
            color={connection.connected ? 'success' : 'default'}
            variant={connection.connected ? 'filled' : 'outlined'}
            label={statusLabel}
          />
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          {connection.database && (
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {checkedLine}
            </Typography>
          )}
          {connection.lastTestError && <Alert severity="error">{connection.lastTestError}</Alert>}
          <DataCloneConnectionForm connection={connection} busy={busy} onSubmit={onSubmit} />
          {connection.hasUri && (
            <Stack direction="row" sx={{
              justifyContent: "flex-start"
            }}>
              <Button size="small" startIcon={<RefreshIcon />} onClick={onTest} disabled={busy}>
                {t('tech.dataClone.retest')}
              </Button>
            </Stack>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
