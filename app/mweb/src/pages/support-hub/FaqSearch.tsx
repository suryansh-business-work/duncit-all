import { useQuery } from '@apollo/client';
import {
  Box,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { SEARCH_FAQS, type FaqItem } from './faqQueries';
import { useTranslation } from '../../i18n/useTranslation';

interface FaqSearchProps {
  query: string;
  onQueryChange: (value: string) => void;
  onOpen: (faq: FaqItem) => void;
}

/** Debounced server-side FAQ search; renders matching questions below the field. */
export default function FaqSearch({ query, onQueryChange, onOpen }: Readonly<FaqSearchProps>) {
  const { t } = useTranslation();
  const debounced = useDebouncedValue(query.trim(), 350);
  const active = debounced.length > 0;
  const { data, loading } = useQuery(SEARCH_FAQS, {
    variables: { search: debounced },
    skip: !active,
    fetchPolicy: 'cache-and-network',
  });
  const results: FaqItem[] = data?.faqs ?? [];

  return (
    <Box>
      <TextField
        fullWidth
        size="small"
        placeholder={t('mweb.common.searchForTopicsOrQuestions')}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 999, bgcolor: 'background.paper', minHeight: 48 } }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: query ? (
              <InputAdornment position="end">
                <DuncitIconButton size="small" onClick={() => onQueryChange('')} aria-label={t('mweb.common.clearSearch')}>
                  <CloseIcon fontSize="small" />
                </DuncitIconButton>
              </InputAdornment>
            ) : null,
          }
        }}
      />
      {active && (
        <Paper variant="outlined" sx={{ mt: 1, borderRadius: '16px', overflow: 'hidden' }}>
          {loading && (
            <Stack sx={{ p: 1 }} spacing={1}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="rounded" height={40} />
              ))}
            </Stack>
          )}
          {!loading && results.length === 0 && (
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                p: 2
              }}>
              No FAQs match “{debounced}”. Try starting a conversation below.
            </Typography>
          )}
          {!loading && results.length > 0 && (
            <List disablePadding>
              {results.map((faq, index) => (
                <ListItemButton
                  key={faq.id}
                  divider={index < results.length - 1}
                  onClick={() => onOpen(faq)}
                >
                  <ListItemText primary={faq.question} slotProps={{
                    primary: { sx: { fontWeight: 700 } }
                  }} />
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>
      )}
    </Box>
  );
}
