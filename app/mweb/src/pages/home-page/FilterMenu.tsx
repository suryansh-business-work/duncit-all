import { useState } from 'react';
import { Badge, Box, Tooltip } from '@mui/material';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { DuncitButton, DuncitRoundButton } from '@duncit/buttons';
import ResponsiveDialog from '../../components/ResponsiveDialog';
import { useTranslation } from '../../i18n/useTranslation';
import FilterBar from './FilterBar';
import type { DateFilter, PriceFilter, SortBy } from './queries';

interface Props {
  categoryChips: any[];
  categoryId: string;
  setCategoryId: (v: string) => void;
  priceFilter: PriceFilter;
  setPriceFilter: (v: PriceFilter) => void;
  dateFilter: DateFilter;
  setDateFilter: (v: DateFilter) => void;
  sortBy: SortBy;
  setSortBy: (v: SortBy) => void;
  locationId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Disabled when there are no clubs/pods to filter. */
  disabled?: boolean;
  /** Forwarded to FilterBar — off on the full pod lists, whose order is fixed. */
  showSort?: boolean;
  /** Home's trigger: the 52px round green button beside the search bar
   * (native twin: HomeFilterButton `round`). Off = the "Filter" pill. */
  round?: boolean;
}

const DEFAULT_SORT: SortBy = 'DATE_ASC';

/** The round trigger's own look — the filled primary circle, kept legible (just
 * dimmed) while disabled, as native draws it. */
const ROUND_SX = {
  width: 52,
  height: 52,
  minWidth: 52,
  minHeight: 52,
  bgcolor: 'primary.main',
  color: 'primary.contrastText',
  '&:hover': { bgcolor: 'primary.dark' },
  '&.Mui-disabled': { bgcolor: 'primary.main', color: 'primary.contrastText', opacity: 0.4 },
} as const;

/** The "Filter" pill used on the full pod lists. */
const PILL_SX = {
  border: '1px solid var(--duncit-card-border)',
  bgcolor: 'background.paper',
  color: 'text.primary',
  minHeight: 40,
  px: 1.5,
  fontWeight: 600,
  '&:hover': { bgcolor: 'action.hover' },
} as const;

export default function FilterMenu(props: Readonly<Props>) {
  const { t } = useTranslation();
  const {
    categoryId,
    setCategoryId,
    priceFilter,
    setPriceFilter,
    dateFilter,
    setDateFilter,
    sortBy,
    setSortBy,
  } = props;

  const [internalOpen, setInternalOpen] = useState(false);
  const open = props.open ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (props.onOpenChange) props.onOpenChange(next);
    else setInternalOpen(next);
  };

  const activeCount =
    (categoryId ? 1 : 0) +
    (priceFilter === 'ALL' ? 0 : 1) +
    (dateFilter === 'ALL' ? 0 : 1) +
    (sortBy === DEFAULT_SORT ? 0 : 1);

  const handleReset = () => {
    setCategoryId('');
    setPriceFilter('ALL');
    setDateFilter('ALL');
    setSortBy(DEFAULT_SORT);
  };

  const activeCountSuffix = activeCount ? ` (${activeCount} active)` : '';
  const triggerLabel = `Open filters${activeCountSuffix}`;
  const trigger = props.round ? (
    <Badge badgeContent={activeCount} color="secondary" overlap="circular">
      <DuncitRoundButton
        onClick={() => setOpen(true)}
        disabled={props.disabled}
        aria-label={triggerLabel}
        sx={ROUND_SX}
      >
        <TuneRoundedIcon />
      </DuncitRoundButton>
    </Badge>
  ) : (
    <DuncitButton
      onClick={() => setOpen(true)}
      disabled={props.disabled}
      aria-label={triggerLabel}
      startIcon={
        <Badge badgeContent={activeCount} color="secondary" overlap="circular">
          <TuneRoundedIcon sx={{ fontSize: 18 }} />
        </Badge>
      }
      sx={PILL_SX}
    >
      {t('mweb.home.vibeFilter')}
    </DuncitButton>
  );

  return (
    <>
      <Tooltip title={props.disabled ? '' : t('mweb.home.vibeFilter')}>
        <Box component="span" sx={{ display: 'inline-flex' }}>
          {trigger}
        </Box>
      </Tooltip>

      <ResponsiveDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('mweb.common.filters')}
        sheetMaxHeight="78dvh"
        actions={
          <>
            <DuncitButton
              size="small"
              startIcon={<RestartAltIcon />}
              onClick={handleReset}
              disabled={activeCount === 0}
            >
              Reset
            </DuncitButton>
            <DuncitButton size="small" variant="contained" onClick={() => setOpen(false)}>
              {t('mweb.common.done')}
            </DuncitButton>
          </>
        }
      >
        <Box>
          <FilterBar {...props} />
        </Box>
      </ResponsiveDialog>
    </>
  );
}
