import { Box, Card, CardContent, MenuItem, Stack, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import {
  COMPENSATION_STATUSES,
  COMPENSATION_STATUS_KEYS,
  ExpenseOptionSelect,
  RelatedEntityPicker,
} from '../expense-config';
import type { ExpenseDashboardFilter } from './queries';

interface Props {
  value: ExpenseDashboardFilter;
  onChange: (next: ExpenseDashboardFilter) => void;
  onReset: () => void;
}

const FIELD_SX = { flex: '1 1 200px', minWidth: 190 } as const;

const toIso = (date: Date | null) => (date ? date.toISOString() : '');
const fromIso = (iso?: string | null) => (iso ? new Date(iso) : null);

/**
 * The dashboard's filter bar.
 *
 * Every dropdown here reads the SAME configured lists the Expense form writes
 * with, so a category Finance adds is filterable the moment it exists — there
 * is no second list to remember to extend.
 */
export default function ExpenseDashboardFilters({ value, onChange, onReset }: Readonly<Props>) {
  const { t } = useTranslation();
  const set = (patch: Partial<ExpenseDashboardFilter>) => onChange({ ...value, ...patch });

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Box sx={FIELD_SX}>
            <DatePicker
              label={t('finance.expenseDashboard.from')}
              value={fromIso(value.from)}
              onChange={(date) => set({ from: toIso(date) })}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Box>
          <Box sx={FIELD_SX}>
            <DatePicker
              label={t('finance.expenseDashboard.to')}
              value={fromIso(value.to)}
              onChange={(date) => set({ to: toIso(date) })}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Box>

          <Box sx={FIELD_SX}>
            <ExpenseOptionSelect
              kind="CATEGORY"
              label={t('finance.expenseManagement.category')}
              value={value.category ?? ''}
              onChange={(key) => set({ category: key })}
              allowEmpty
            />
          </Box>

          <Box sx={FIELD_SX}>
            <ExpenseOptionSelect
              kind="RELATED_FROM_TYPE"
              label={t('finance.expenseConfig.relatedFrom')}
              value={value.related_from_type ?? ''}
              // Changing the type invalidates the entity chosen under the old
              // one, so both move together rather than leaving a venue id
              // filtering a list of hosts.
              onChange={(key) => set({ related_from_type: key, related_from_id: '' })}
              allowEmpty
            />
          </Box>

          <Box sx={FIELD_SX}>
            <RelatedEntityPicker
              typeKey={value.related_from_type ?? ''}
              value={value.related_from_id ?? ''}
              onChange={(entityId) => set({ related_from_id: entityId })}
              label={t('finance.expenseConfig.relatedEntity')}
            />
          </Box>

          <Box sx={FIELD_SX}>
            <TextField
              select
              fullWidth
              label={t('finance.expenseConfig.compensationStatus')}
              value={value.compensation_status ?? ''}
              onChange={(event) => set({ compensation_status: event.target.value })}
            >
              <MenuItem value="">{t('finance.expenseConfig.anyOption')}</MenuItem>
              {COMPENSATION_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {t(COMPENSATION_STATUS_KEYS[status])}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box sx={FIELD_SX}>
            <ExpenseOptionSelect
              kind="COMPENSATION_METHOD"
              label={t('finance.expenseConfig.compensationMethod')}
              value={value.compensation_method ?? ''}
              onChange={(key) => set({ compensation_method: key })}
              allowEmpty
            />
          </Box>

          <Box sx={FIELD_SX}>
            <TextField
              fullWidth
              label={t('finance.expenseConfig.paidBy')}
              value={value.paid_by ?? ''}
              onChange={(event) => set({ paid_by: event.target.value })}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DuncitButton onClick={onReset}>{t('finance.expenseDashboard.clearFilters')}</DuncitButton>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
