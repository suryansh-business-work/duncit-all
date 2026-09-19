import { useId } from 'react';
import {
  Checkbox,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { SocialAccount } from '../queries';

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

const PERIOD_LABEL: Record<Period, string> = {
  7: 'marketing.social.period7',
  30: 'marketing.social.period30',
  90: 'marketing.social.period90',
};

interface Props {
  accounts: SocialAccount[];
  accountIds: string[];
  onAccountIds: (ids: string[]) => void;
  days: Period;
  onDays: (days: Period) => void;
}

/** One row above the charts: which accounts, and over how long. Empty = every account. */
export default function AnalyticsFilters({ accounts, accountIds, onAccountIds, days, onDays }: Readonly<Props>) {
  const { t } = useTranslation();
  const labelId = useId();
  const names = new Map(accounts.map((account) => [account.id, account.name]));

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
      <FormControl size="small" sx={{ minWidth: 260 }}>
        <InputLabel id={labelId} shrink>
          {t('marketing.social.accountsFilter')}
        </InputLabel>
        <Select
          multiple
          displayEmpty
          labelId={labelId}
          // Notched with the label held up: "All accounts" shows when nothing is picked.
          input={<OutlinedInput notched label={t('marketing.social.accountsFilter')} />}
          value={accountIds}
          onChange={(event) => {
            const { value } = event.target;
            onAccountIds(typeof value === 'string' ? value.split(',') : value);
          }}
          renderValue={(selected) =>
            selected.length === 0
              ? t('marketing.social.allAccounts')
              : selected.map((id) => names.get(id) ?? id).join(', ')
          }
          data-testid="social-analytics-accounts"
        >
          {accounts.map((account) => (
            <MenuItem key={account.id} value={account.id}>
              <Checkbox size="small" checked={accountIds.includes(account.id)} />
              <ListItemText primary={account.name} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={days}
        onChange={(_event, next: Period | null) => {
          if (next) onDays(next);
        }}
        aria-label={t('marketing.social.period')}
        data-testid="social-analytics-period"
      >
        {PERIODS.map((period) => (
          <ToggleButton key={period} value={period}>
            {t(PERIOD_LABEL[period])}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}
