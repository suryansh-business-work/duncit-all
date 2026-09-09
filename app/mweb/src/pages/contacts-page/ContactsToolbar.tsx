import { InputAdornment, Stack, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DuncitTabs, type DuncitTabsState } from '@duncit/tabs';
import { useTranslation } from '../../i18n/useTranslation';

export type ContactsScope = 'all' | 'nearby' | 'invite';

interface Props {
  tabs: DuncitTabsState<ContactsScope>;
  search: string;
  onSearch: (value: string) => void;
}

/** The three lists this page holds: everyone matched, only the matches in the
 * viewer's city, and the contacts who are not here yet. Plus the search the
 * three share. Twin of native `ContactsFilters` (rule 27). */
export default function ContactsToolbar({ tabs, search, onSearch }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <DuncitTabs
        {...tabs}
        variant="fullWidth"
        sx={{ minHeight: 40, '& .MuiTab-root': { fontWeight: 700, minHeight: 40 } }}
      />
      <TextField
        size="small"
        fullWidth
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder={t('mweb.contacts.searchPlaceholder')}
        slotProps={{
          htmlInput: { 'aria-label': t('mweb.contacts.searchPlaceholder'), 'data-testid': 'contacts-search' },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
    </Stack>
  );
}
