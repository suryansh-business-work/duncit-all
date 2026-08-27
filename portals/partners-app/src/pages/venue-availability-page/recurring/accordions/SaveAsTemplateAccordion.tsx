import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import {
  CREATE_SLOT_TEMPLATE,
  DELETE_SLOT_TEMPLATE,
  MY_SLOT_TEMPLATES,
} from '../recurring.queries';
import { timeToHHMM } from '../settings-map';
import { newTimeSlot, type RecurringForm } from '../useRecurringDialog';
import { useTranslation } from '@duncit/shell';

const toInt = (v: string) => Math.max(0, Math.round(Number(v) || 0));

interface Props {
  venueId: string;
  form: RecurringForm;
  patch: (p: Partial<RecurringForm>) => void;
}

export default function SaveAsTemplateAccordion({ venueId, form, patch }: Readonly<Props>) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const { data, refetch } = useQuery(MY_SLOT_TEMPLATES, { variables: { venue_id: venueId } });
  const [createTemplate, { loading: saving, error }] = useMutation(CREATE_SLOT_TEMPLATE);
  const [deleteTemplate] = useMutation(DELETE_SLOT_TEMPLATE);
  const templates = data?.mySlotTemplates ?? [];

  // Templates capture the schedule skeleton (weekdays + the first time range + a
  // base price). Applying sets one time slot and that base price on every space;
  // per-space prices are then adjustable. The server template shape is unchanged.
  const apply = (t: any) =>
    patch({
      weekdays: t.config.weekdays,
      timeSlots: [newTimeSlot(t.config.start_time, t.config.end_time)],
      spaces: form.spaces.map((s) => ({ ...s, price: String(t.config.default_price) })),
      skipWeeklyOff: t.config.skip_weekly_off,
      skipHolidays: t.config.skip_holidays,
    });

  const save = async () => {
    const first = form.timeSlots[0];
    const basePrice = form.spaces.find((s) => s.enabled) ?? form.spaces[0];
    await createTemplate({
      variables: {
        input: {
          venue_id: venueId,
          name: name.trim(),
          config: {
            weekdays: form.weekdays,
            start_time: timeToHHMM(first?.start ?? null),
            end_time: timeToHHMM(first?.end ?? null),
            default_price: toInt(basePrice?.price ?? '0'),
            per_day_price: [],
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
        <Stack direction="row" spacing={1.5} sx={{
          alignItems: "center"
        }}>
          <BookmarkBorderIcon fontSize="small" color="action" />
          <div>
            <Typography sx={{
              fontWeight: 800
            }}>{t('partners.venueAvailabilityPage.saveAsTemplate')}</Typography>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
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
                <Stack key={t.id} direction="row" spacing={1} sx={{
                  alignItems: "center"
                }}>
                  <Chip size="small" label={t.name} onClick={() => apply(t)} sx={{ cursor: 'pointer' }} />
                  {t.is_default && <Chip size="small" color="primary" label={t('partners.common.default')} />}
                  <Box sx={{ flex: 1 }} />
                  <DuncitButton size="small" onClick={() => apply(t)}>
                    Use
                  </DuncitButton>
                  <DuncitIconButton size="small" aria-label={`Delete ${t.name}`} onClick={() => remove(t.id)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </DuncitIconButton>
                </Stack>
              ))}
            </Stack>
          )}
          {error && <Alert severity="error">{error.message}</Alert>}
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              label={t('partners.venueAvailabilityPage.templateName')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ flex: 1 }}
            />
            <DuncitButton variant="outlined" onClick={save} disabled={saving || name.trim().length === 0}>
              {saving ? 'Saving…' : 'Save'}
            </DuncitButton>
          </Stack>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
