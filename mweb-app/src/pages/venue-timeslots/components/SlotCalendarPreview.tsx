import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay, type PickersDayProps } from '@mui/x-date-pickers/PickersDay';

export interface InstanceRow {
  template_id: string;
  label: string;
  start_at: string;
  end_at: string;
  capacity: number;
  is_blocked: boolean;
  block_reason: string | null;
  is_cancelled: boolean;
  note: string | null;
}

interface Props {
  instances: InstanceRow[];
  loading?: boolean;
}

const isoDay = (iso: string): string => iso.slice(0, 10);

export default function SlotCalendarPreview({ instances, loading }: Props) {
  const [selected, setSelected] = useState<Date | null>(new Date());

  const byDay = useMemo(() => {
    const map = new Map<string, InstanceRow[]>();
    for (const instance of instances) {
      const key = isoDay(instance.start_at);
      const list = map.get(key) ?? [];
      list.push(instance);
      map.set(key, list);
    }
    return map;
  }, [instances]);

  const formatDate = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const selectedKey = selected ? formatDate(selected) : '';
  const selectedDayInstances = byDay.get(selectedKey) ?? [];

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="subtitle1" fontWeight={800}>
          Upcoming slots
        </Typography>
        {loading && <CircularProgress size={14} />}
      </Stack>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <DateCalendar
          value={selected}
          onChange={(value) => setSelected(value)}
          slots={{
            day: (props: PickersDayProps<Date>) => {
              const key = formatDate(props.day);
              const day = byDay.get(key);
              const has = !!day?.length;
              const blocked = day?.some((s) => s.is_blocked || s.is_cancelled);
              return (
                <Box sx={{ position: 'relative' }}>
                  <PickersDay {...props} />
                  {has && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: blocked ? 'error.main' : 'primary.main',
                      }}
                    />
                  )}
                </Box>
              );
            },
          }}
        />
      </Box>
      <Stack spacing={1}>
        <Typography variant="caption" color="text.secondary">
          {selected ? formatDate(selected) : '—'} · {selectedDayInstances.length} slot
          {selectedDayInstances.length === 1 ? '' : 's'}
        </Typography>
        <List dense sx={{ borderRadius: 2, border: 1, borderColor: 'divider' }}>
          {selectedDayInstances.length === 0 && (
            <ListItem>
              <ListItemText primary="No slots on this day." />
            </ListItem>
          )}
          {selectedDayInstances.map((instance) => (
            <ListItem key={`${instance.template_id}-${instance.start_at}`} divider>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={700}>
                      {instance.label}
                    </Typography>
                    {instance.is_blocked && (
                      <Chip size="small" color="error" label="Blocked" variant="outlined" />
                    )}
                    {instance.is_cancelled && !instance.is_blocked && (
                      <Chip size="small" color="warning" label="Cancelled" variant="outlined" />
                    )}
                  </Stack>
                }
                secondary={`${instance.start_at.slice(11, 16)} – ${instance.end_at.slice(
                  11,
                  16,
                )} · ${instance.capacity} people${
                  instance.block_reason ? ` · ${instance.block_reason}` : ''
                }`}
              />
            </ListItem>
          ))}
        </List>
      </Stack>
    </Stack>
  );
}
