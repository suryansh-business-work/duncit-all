import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import ScheduleIcon from '@mui/icons-material/Schedule';
import type { SlotTemplateFormValues } from '../slot-template-form/slot-template.types';

export interface TemplateRow extends SlotTemplateFormValues {
  id: string;
}

interface Props {
  template: TemplateRow;
  onEdit: (template: TemplateRow) => void;
  onDelete: (template: TemplateRow) => void;
  onToggleActive: (template: TemplateRow, next: boolean) => void;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function summarizeRecurrence(t: TemplateRow): string {
  if (t.recurrence_kind === 'WEEKLY') {
    return `Weekly · ${t.weekdays.map((d) => WEEKDAY_NAMES[d]).join(', ') || '—'}`;
  }
  if (t.recurrence_kind === 'MONTHLY') {
    if (t.month_nth_weekday) {
      const nthLabel =
        ['Last', '', 'First', 'Second', 'Third', 'Fourth', 'Fifth'][t.month_nth_weekday.nth + 1] ||
        `Nth ${t.month_nth_weekday.nth}`;
      return `Monthly · ${nthLabel} ${WEEKDAY_NAMES[t.month_nth_weekday.weekday]}`;
    }
    return `Monthly · days ${t.month_days.join(', ') || '—'}`;
  }
  return `Specific dates · ${t.specific_dates.length} date${t.specific_dates.length === 1 ? '' : 's'}`;
}

export default function SlotTemplateCard({ template, onEdit, onDelete, onToggleActive }: Props) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Typography variant="subtitle1" fontWeight={800} noWrap>
                {template.label || `${template.start_time} slot`}
              </Typography>
              <Chip
                size="small"
                label={template.is_active ? 'Active' : 'Paused'}
                color={template.is_active ? 'success' : 'default'}
              />
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap' }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <ScheduleIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {template.start_time} – {template.end_time} ({template.duration_minutes} min)
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <GroupIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {template.capacity} people
                </Typography>
              </Stack>
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              {summarizeRecurrence(template)}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title={template.is_active ? 'Pause' : 'Activate'}>
              <Switch
                checked={template.is_active}
                onChange={(_event, next) => onToggleActive(template, next)}
              />
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => onEdit(template)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => onDelete(template)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
