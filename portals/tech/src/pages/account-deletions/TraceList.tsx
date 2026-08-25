import {
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { useTranslation } from '@duncit/app-settings';
import type { TraceGroup } from './queries';

const DELETES_DOCUMENTS = 'DELETE_DOCUMENTS';

interface Props {
  trace: TraceGroup[];
  /** The group currently being deleted, as `model_name.field_path`. */
  busyKey: string | null;
  /** Off once the request is closed — a finished request is a record, not a tool. */
  canDelete: boolean;
  onDelete: (group: TraceGroup) => void;
}

export const groupKey = (group: TraceGroup) => `${group.model_name}.${group.field_path}`;

/**
 * Where the member still appears, one row per reference, each with its own
 * delete.
 *
 * Grouped by collection-and-field rather than listed document by document on
 * purpose: a member with 40,000 telemetry rows would otherwise open a page
 * nobody can act on. The operator is deciding "clear this member out of the
 * chat logs", not "delete this particular log line".
 */
export default function TraceList({ trace, busyKey, canDelete, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();

  if (trace.length === 0) {
    return (
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        {t('tech.accountDeletions.traceEmpty')}
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 360 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>{t('tech.accountDeletions.collection')}</TableCell>
            <TableCell>{t('tech.accountDeletions.field')}</TableCell>
            <TableCell>{t('tech.accountDeletions.effect')}</TableCell>
            <TableCell align="right">{t('tech.accountDeletions.records')}</TableCell>
            <TableCell align="right" />
          </TableRow>
        </TableHead>
        <TableBody>
          {trace.map((group) => {
            const key = groupKey(group);
            const busy = busyKey === key;
            const deletes = group.purge_kind === DELETES_DOCUMENTS;
            return (
              <TableRow key={key} hover>
                <TableCell>
                  <Stack direction="row" spacing={1} sx={{
                    alignItems: "center"
                  }}>
                    <Typography variant="body2" sx={{
                      fontWeight: 600
                    }}>
                      {group.collection_name}
                    </Typography>
                    <Chip size="small" variant="outlined" label={group.model_name} />
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: "monospace",
                      color: "text.secondary"
                    }}>
                    {group.field_path}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    variant="outlined"
                    color={deletes ? 'error' : 'default'}
                    label={
                      deletes
                        ? t('tech.accountDeletions.effectDelete')
                        : t('tech.accountDeletions.effectRemove')
                    }
                    title={
                      deletes
                        ? t('tech.accountDeletions.effectDeleteHint')
                        : t('tech.accountDeletions.effectRemoveHint')
                    }
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">{group.count}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlineIcon />}
                    disabled={!canDelete || !!busyKey}
                    onClick={() => onDelete(group)}
                    data-testid={`purge-${key}`}
                    sx={{ textTransform: 'none' }}
                  >
                    {busy
                      ? t('tech.accountDeletions.deletingGroup')
                      : t('tech.accountDeletions.deleteGroup')}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
