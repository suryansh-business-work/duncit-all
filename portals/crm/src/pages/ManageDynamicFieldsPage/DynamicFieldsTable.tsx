import { useState } from 'react';
import {
  Chip,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitIconButton } from '@duncit/buttons';
import type { CrmDynamicField } from '../../api/crm.types';
import { KIND_LABELS, moveItem } from './dynamicFieldDraft';
import { useTranslation } from '@duncit/shell';

interface Props {
  rows: CrmDynamicField[];
  busy: boolean;
  draftOpen: boolean;
  onEdit: (row: CrmDynamicField) => void;
  onDelete: (row: CrmDynamicField) => void;
  onToggleActive: (row: CrmDynamicField) => void;
  /** Receives the full ordered list of ids after a drag reorder. */
  onReorder: (ids: string[]) => void;
}

export default function DynamicFieldsTable({
  rows,
  busy,
  draftOpen,
  onEdit,
  onDelete,
  onToggleActive,
  onReorder,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleDrop = (to: number) => {
    if (dragIndex === null || dragIndex === to) return;
    const reordered = moveItem(rows, dragIndex, to);
    setDragIndex(null);
    onReorder(reordered.map((r) => r.id));
  };

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ width: 44 }} />
          <TableCell>{t('crm.managedynamicfieldspage.label')}</TableCell>
          <TableCell sx={{ width: 150 }}>Type</TableCell>
          <TableCell sx={{ width: 200 }}>{t('crm.common.appliesTo')}</TableCell>
          <TableCell sx={{ width: 100 }}>{t('crm.common.active')}</TableCell>
          <TableCell sx={{ width: 120 }} align="right">{t('shell.common.actions')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.length === 0 && !draftOpen && (
          <TableRow>
            <TableCell colSpan={6} align="center">
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  py: 3
                }}>
                No dynamic fields yet. Click "New field" to add one — it will appear on every lead
                edit form.
              </Typography>
            </TableCell>
          </TableRow>
        )}
        {rows.map((row, index) => (
          <TableRow
            key={row.id}
            hover
            draggable={!busy && !draftOpen}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            data-testid={`dynamic-field-row-${row.name}`}
            sx={{ cursor: !busy && !draftOpen ? 'grab' : 'default' }}
          >
            <TableCell>
              <DragIndicatorIcon fontSize="small" sx={{ color: 'text.disabled' }} aria-label={t('crm.managedynamicfieldspage.dragToReorder')} />
            </TableCell>
            <TableCell>
              <Stack direction="row" spacing={1} sx={{
                alignItems: "center"
              }}>
                <Typography variant="body2" sx={{
                  fontWeight: 600
                }}>
                  {row.label}
                </Typography>
                {row.required && <Chip size="small" label={t('crm.managedynamicfieldspage.required')} color="warning" />}
                {row.kind === 'select' && row.multi && <Chip size="small" label={t('crm.managedynamicfieldspage.multi')} variant="outlined" />}
              </Stack>
              {row.hint && (
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>
                  {row.hint}
                </Typography>
              )}
            </TableCell>
            <TableCell>{KIND_LABELS[row.kind]}</TableCell>
            <TableCell>
              <Stack direction="row" spacing={0.5}>
                {row.applies_to_venue && <Chip size="small" label={t('crm.common.venue')} />}
                {row.applies_to_host && <Chip size="small" label={t('crm.common.host')} />}
                {row.applies_to_ecomm && <Chip size="small" label={t('crm.common.ecomm')} />}
              </Stack>
            </TableCell>
            <TableCell>
              <Switch checked={row.is_active} onChange={() => onToggleActive(row)} disabled={busy} />
            </TableCell>
            <TableCell align="right">
              <Tooltip title={t('shell.common.edit')}>
                <span>
                  <DuncitIconButton aria-label={t('shell.common.edit')} size="small" onClick={() => onEdit(row)} disabled={busy || draftOpen}>
                    <EditIcon fontSize="small" />
                  </DuncitIconButton>
                </span>
              </Tooltip>
              <Tooltip title={t('shell.common.delete')}>
                <span>
                  <DuncitIconButton aria-label={t('shell.common.delete')} size="small" color="error" onClick={() => onDelete(row)} disabled={busy || draftOpen}>
                    <DeleteIcon fontSize="small" />
                  </DuncitIconButton>
                </span>
              </Tooltip>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
