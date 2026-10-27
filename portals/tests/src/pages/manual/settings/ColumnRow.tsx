import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Paper, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { CategoryChip } from '../../../components/manual/CategoryChip';
import { CATEGORY_KEYS } from '../shared/vocabulary';
import type { ManualColumn } from '../shared/types';

interface Props {
  column: ManualColumn;
  /** The last column cannot be deleted: its cases would have nowhere to go. */
  deletable: boolean;
  onEdit: (column: ManualColumn) => void;
  onDelete: (column: ManualColumn) => void;
}

/** One column in Settings: dragged by its handle (or Space + arrows), edited, deleted. */
export const ColumnRow = memo(function ColumnRow({ column, deletable, onEdit, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: column.id });

  return (
    <Paper
      component="li"
      ref={setNodeRef}
      variant="outlined"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      sx={{ p: 1, opacity: isDragging ? 0.5 : 1 }}
    >
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <DuncitIconButton
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={t('testsManual.settings.dragHandle', { vars: { name: column.name } })}
          sx={{ cursor: 'grab' }}
        >
          <DragIndicatorIcon />
        </DuncitIconButton>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, minWidth: 0, flex: 1 }} noWrap>
          {column.name}
        </Typography>
        <CategoryChip category={column.category} label={t(CATEGORY_KEYS[column.category])} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {typeof column.wip_limit === 'number'
            ? t('testsManual.settings.limit', { vars: { limit: column.wip_limit } })
            : t('testsManual.settings.noLimit')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('testsManual.settings.cases', { vars: { count: column.case_count ?? 0 } })}
        </Typography>
        <DuncitIconButton
          aria-label={t('testsManual.settings.editNamed', { vars: { name: column.name } })}
          onClick={() => onEdit(column)}
        >
          <EditOutlinedIcon fontSize="small" />
        </DuncitIconButton>
        <DuncitIconButton
          aria-label={t('testsManual.settings.deleteNamed', { vars: { name: column.name } })}
          onClick={() => onDelete(column)}
          disabled={!deletable}
        >
          <DeleteOutlineIcon fontSize="small" />
        </DuncitIconButton>
      </Stack>
    </Paper>
  );
});
