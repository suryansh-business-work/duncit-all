import { Alert, InputAdornment, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import type { StockSearch } from './useStockSearch';

/**
 * The pieces every library shelf has — footage and music alike — so each
 * shelf is only what makes it different: what it searches for and how a
 * result is drawn.
 */

interface FieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  testId: string;
}

export function ShelfSearchField({ value, onChange, label, placeholder, testId }: Readonly<FieldProps>) {
  return (
    <TextField
      size="small"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      label={label}
      placeholder={placeholder}
      slotProps={{
        htmlInput: { 'data-testid': testId },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

interface StatusProps {
  search: StockSearch;
  /** Shown when the server's own words are not available. */
  failedText: string;
  emptyText: string;
  /** `reel-stock` or `reel-music`: the shelf's test id prefix. */
  prefix: string;
}

/** Why the shelf shows no results: the search failed, or found nothing. */
export function ShelfStatus({ search, failedText, emptyText, prefix }: Readonly<StatusProps>) {
  if (search.error) {
    return (
      <Alert severity="error" sx={{ mb: 1 }} data-testid={`${prefix}-error`}>
        {parseApiError(search.error, failedText)}
      </Alert>
    );
  }
  if (!search.searched || search.loading || search.items.length > 0) return null;
  return (
    <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }} data-testid={`${prefix}-empty`}>
      {emptyText}
    </Typography>
  );
}

/** The bottom of the results: a spinner while a page loads, then the way to the next one. */
export function ShelfMore({ search, prefix }: Readonly<{ search: StockSearch; prefix: string }>) {
  const { t } = useTranslation();
  return (
    <>
      {search.loading && <Loader variant="block" />}
      {search.hasMore && (
        <DuncitButton size="small" fullWidth onClick={search.more} sx={{ mt: 1 }} data-testid={`${prefix}-more`}>
          {t('ai.reels.stock.more')}
        </DuncitButton>
      )}
    </>
  );
}
