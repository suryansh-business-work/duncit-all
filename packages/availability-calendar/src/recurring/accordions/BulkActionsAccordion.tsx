import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Stack, TextField, Typography } from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import DayOfWeekPicker from '../DayOfWeekPicker';
import { BULK_DELETE_VENUE_SLOTS, BULK_UPDATE_VENUE_SLOTS } from '../../queries';
import AdvancedAccordion from './AdvancedAccordion';

const toInt = (v: string) => Math.max(0, Math.round(Number(v) || 0));

interface BulkResult {
  matched: number;
  affected: number;
  skipped: number;
}

interface Props {
  venueId: string;
  onDone: () => Promise<void> | void;
}

export default function BulkActionsAccordion({ venueId, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [price, setPrice] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | { text: string; run: () => Promise<void> }>(null);
  const [bulkDelete, { error: deleteError }] = useMutation<{ bulkDeleteVenueSlots: BulkResult }>(
    BULK_DELETE_VENUE_SLOTS,
  );
  const [bulkUpdate, { error: updateError }] = useMutation<{ bulkUpdateVenueSlots: BulkResult }>(
    BULK_UPDATE_VENUE_SLOTS,
  );

  const filter = () => ({
    venue_id: venueId,
    ...(from ? { from: from.toISOString() } : {}),
    ...(to ? { to: to.toISOString() } : {}),
    ...(weekdays.length ? { weekdays } : {}),
  });

  const runDelete = async () => {
    const { data } = await bulkDelete({ variables: { input: filter() } });
    setResult(t('availability.bulk.deleted', { vars: { count: data?.bulkDeleteVenueSlots.affected ?? 0 } }));
    await onDone();
  };
  const runUpdate = async (extra: Record<string, unknown>, action: string) => {
    const { data } = await bulkUpdate({ variables: { input: { ...filter(), ...extra } } });
    const r = data?.bulkUpdateVenueSlots ?? { matched: 0, affected: 0, skipped: 0 };
    const vars = { action, count: r.affected, skipped: r.skipped };
    setResult(
      r.skipped ? t('availability.bulk.updatedSkipped', { vars }) : t('availability.bulk.updated', { vars }),
    );
    await onDone();
  };
  const confirmThen = (text: string, run: () => Promise<void>) => setConfirm({ text, run });
  const runConfirmed = async () => {
    const action = confirm;
    setConfirm(null);
    await action?.run();
  };
  const bulkError = deleteError ?? updateError;

  return (
    <AdvancedAccordion
      icon={<DeleteForeverIcon fontSize="small" color="error" />}
      title={t('availability.bulk.title')}
      caption={t('availability.bulk.caption')}
      tone="error"
    >
      <Stack spacing={2}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('availability.bulk.filterHint')}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <DatePicker
            label={t('availability.bulk.from')}
            value={from}
            onChange={setFrom}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
          <DatePicker
            label={t('availability.bulk.to')}
            value={to}
            onChange={setTo}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
        </Stack>
        <DayOfWeekPicker value={weekdays} onChange={setWeekdays} />
        {result && (
          <Alert severity="info" onClose={() => setResult(null)}>
            {result}
          </Alert>
        )}
        {bulkError && <Alert severity="error">{bulkError.message}</Alert>}
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, alignItems: 'center' }}>
          <DuncitButton
            color="error"
            variant="outlined"
            onClick={() => confirmThen(t('availability.bulk.confirmDelete'), runDelete)}
          >
            {t('availability.bulk.deleteMatching')}
          </DuncitButton>
          <DuncitButton
            color="error"
            variant="text"
            onClick={() =>
              confirmThen(t('availability.bulk.confirmDisable'), () =>
                runUpdate({ block: true }, t('availability.bulk.actionDisabled')),
              )
            }
          >
            {t('availability.bulk.disable')}
          </DuncitButton>
          <DuncitButton
            variant="text"
            onClick={() =>
              confirmThen(t('availability.bulk.confirmEnable'), () =>
                runUpdate({ block: false }, t('availability.bulk.actionEnabled')),
              )
            }
          >
            {t('availability.bulk.enable')}
          </DuncitButton>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <TextField
            size="small"
            type="number"
            label={t('availability.bulk.newPrice')}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            sx={{ maxWidth: 160 }}
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <DuncitButton
            variant="outlined"
            disabled={price === ''}
            onClick={() =>
              confirmThen(t('availability.bulk.confirmReprice', { vars: { price: toInt(price) } }), () =>
                runUpdate({ set_price: toInt(price) }, t('availability.bulk.actionRepriced')),
              )
            }
          >
            {t('availability.bulk.setPrice')}
          </DuncitButton>
        </Stack>
      </Stack>

      <ConfirmDialog
        open={!!confirm}
        destructive
        title={t('availability.bulk.confirmTitle')}
        message={confirm?.text}
        confirmLabel={t('availability.bulk.confirm')}
        cancelLabel={t('availability.cancel')}
        onConfirm={runConfirmed}
        onClose={() => setConfirm(null)}
      />
    </AdvancedAccordion>
  );
}
