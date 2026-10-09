import { Chip, InputAdornment, Stack, TextField } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { ALL_FULFILMENT_STATUSES, statusLabel } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { testIdProps } from '../../utils/testIdProps';

interface Props {
  search: string;
  status: string;
  onSearch: (value: string) => void;
  onStatus: (status: string) => void;
}

/** The order search and the status chips — "All", then every status in the
 * working order the seller's filter uses. Native twin: BrandOrdersFilters. */
export default function BrandOrdersFilters({ search, status, onSearch, onStatus }: Readonly<Props>) {
  const { t } = useTranslation();
  const chip = (value: string, label: string) => (
    <Chip
      key={value || 'all'}
      label={label}
      clickable
      color={status === value ? 'primary' : 'default'}
      variant={status === value ? 'filled' : 'outlined'}
      aria-pressed={status === value}
      onClick={() => onStatus(value)}
      data-testid={`brand-orders-status-${value || 'all'}`}
    />
  );
  return (
    <Stack spacing={1.5}>
      <TextField
        size="small"
        type="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        label={t('mweb.brandOrders.searchLabel')}
        slotProps={{
          htmlInput: testIdProps('brand-orders-search'),
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      <Stack
        direction="row"
        role="group"
        aria-label={t('mweb.brandOrders.statusFilterLabel')}
        sx={{ gap: 1, overflowX: 'auto', pb: 0.5 }}
      >
        {chip('', t('mweb.brandOrders.statusAll'))}
        {ALL_FULFILMENT_STATUSES.map((value) => chip(value, statusLabel(value, t)))}
      </Stack>
    </Stack>
  );
}
