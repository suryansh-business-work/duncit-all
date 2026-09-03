import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Chip, Stack, TextField } from '@mui/material';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { timeToHHMM } from '@duncit/slots';
import { CREATE_SLOT_TEMPLATE, DELETE_SLOT_TEMPLATE, MY_SLOT_TEMPLATES } from '../../queries';
import { newTimeSlot, type RecurringForm } from '../useRecurringDialog';
import AdvancedAccordion from './AdvancedAccordion';

const toInt = (v: string) => Math.max(0, Math.round(Number(v) || 0));

/** A saved template as `mySlotTemplates` returns it. */
interface SlotTemplate {
  id: string;
  name: string;
  is_default: boolean;
  config: {
    weekdays: number[];
    start_time: string;
    end_time: string;
    default_price: number;
    skip_weekly_off: boolean;
    skip_holidays: boolean;
  };
}

interface Props {
  venueId: string;
  form: RecurringForm;
  patch: (p: Partial<RecurringForm>) => void;
}

export default function SaveAsTemplateAccordion({ venueId, form, patch }: Readonly<Props>) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const { data, refetch } = useQuery<{ mySlotTemplates: SlotTemplate[] }>(MY_SLOT_TEMPLATES, {
    variables: { venue_id: venueId },
  });
  const [createTemplate, { loading: saving, error }] = useMutation<{ createSlotTemplate: SlotTemplate }>(
    CREATE_SLOT_TEMPLATE,
  );
  const [deleteTemplate] = useMutation<{ deleteSlotTemplate: boolean }>(DELETE_SLOT_TEMPLATE);
  const templates = data?.mySlotTemplates ?? [];

  // Templates capture the schedule skeleton (weekdays + the first time range + a
  // base price). Applying sets one time slot and that base price on every space;
  // per-space prices are then adjustable. The server template shape is unchanged.
  const apply = (template: SlotTemplate) =>
    patch({
      weekdays: template.config.weekdays,
      timeSlots: [newTimeSlot(template.config.start_time, template.config.end_time)],
      spaces: form.spaces.map((s) => ({ ...s, price: String(template.config.default_price) })),
      skipWeeklyOff: template.config.skip_weekly_off,
      skipHolidays: template.config.skip_holidays,
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
    <AdvancedAccordion
      icon={<BookmarkBorderIcon fontSize="small" color="action" />}
      title={t('availability.templates.title')}
      caption={t('availability.templates.caption')}
    >
      <Stack spacing={1.5}>
        {templates.length > 0 && (
          <Stack spacing={1}>
            {templates.map((template) => (
              <Stack key={template.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Chip size="small" label={template.name} onClick={() => apply(template)} sx={{ cursor: 'pointer' }} />
                {template.is_default && (
                  <Chip size="small" color="primary" label={t('availability.templates.default')} />
                )}
                <Box sx={{ flex: 1 }} />
                <DuncitButton size="small" onClick={() => apply(template)}>
                  {t('availability.templates.use')}
                </DuncitButton>
                <DuncitIconButton
                  size="small"
                  aria-label={t('availability.templates.delete', { vars: { name: template.name } })}
                  onClick={() => remove(template.id)}
                >
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
            label={t('availability.templates.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ flex: 1 }}
          />
          <DuncitButton variant="outlined" onClick={save} disabled={saving || name.trim().length === 0}>
            {saving ? t('availability.templates.saving') : t('availability.templates.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </AdvancedAccordion>
  );
}
