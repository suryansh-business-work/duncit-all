import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  CREATE_SLOT_TEMPLATE,
  DELETE_SLOT_TEMPLATE,
  MY_SLOT_TEMPLATES,
} from '../recurring.queries';
import { hhmmToDate, timeToHHMM } from '../settings-map';
import type { RecurringForm } from '../useRecurringDialog';

const toInt = (v: string) => Math.max(0, Math.round(Number(v) || 0));

interface Props {
  venueId: string;
  form: RecurringForm;
  patch: (p: Partial<RecurringForm>) => void;
}

export default function SaveAsTemplateAccordion({ venueId, form, patch }: Readonly<Props>) {
  const [name, setName] = useState('');
  const { data, refetch } = useQuery(MY_SLOT_TEMPLATES, { variables: { venue_id: venueId } });
  const [createTemplate, { loading: saving, error }] = useMutation(CREATE_SLOT_TEMPLATE);
  const [deleteTemplate] = useMutation(DELETE_SLOT_TEMPLATE);
  const templates = data?.mySlotTemplates ?? [];

  const apply = (t: any) =>
    patch({
      weekdays: t.config.weekdays,
      startTime: hhmmToDate(t.config.start_time),
      endTime: hhmmToDate(t.config.end_time),
      defaultPrice: String(t.config.default_price),
      perDayPrice: Object.fromEntries(t.config.per_day_price.map((p: any) => [p.weekday, String(p.price)])),
      skipWeeklyOff: t.config.skip_weekly_off,
      skipHolidays: t.config.skip_holidays,
    });

  const save = async () => {
    await createTemplate({
      variables: {
        input: {
          venue_id: venueId,
          name: name.trim(),
          config: {
            weekdays: form.weekdays,
            start_time: timeToHHMM(form.startTime),
            end_time: timeToHHMM(form.endTime),
            default_price: toInt(form.defaultPrice),
            per_day_price: Object.entries(form.perDayPrice)
              .filter(([d, p]) => form.weekdays.includes(Number(d)) && String(p).trim() !== '')
              .map(([d, p]) => ({ weekday: Number(d), price: toInt(p) })),
            skip_weekly_off: form.skipWeeklyOff,
            skip_holidays: form.skipHolidays,
          },
        },
      },
    });
    setName('');
    await refetch();
  };

  const remove = async (id: string) => {
    await deleteTemplate({ variables: { id } });
    await refetch();
  };

  return (
    <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <BookmarkBorderIcon fontSize="small" color="action" />
          <div>
            <Typography fontWeight={800}>Save as template</Typography>
            <Typography variant="caption" color="text.secondary">
              Reuse this setup later in one tap
            </Typography>
          </div>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          {templates.length > 0 && (
            <Stack spacing={1}>
              {templates.map((t: any) => (
                <Stack key={t.id} direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label={t.name} onClick={() => apply(t)} sx={{ cursor: 'pointer' }} />
                  {t.is_default && <Chip size="small" color="primary" label="Default" />}
                  <Box sx={{ flex: 1 }} />
                  <Button size="small" onClick={() => apply(t)}>
                    Use
                  </Button>
                  <IconButton size="small" aria-label={`Delete ${t.name}`} onClick={() => remove(t.id)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          )}
          {error && <Alert severity="error">{error.message}</Alert>}
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              label="Template name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ flex: 1 }}
            />
            <Button variant="outlined" onClick={save} disabled={saving || name.trim().length === 0}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Stack>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
