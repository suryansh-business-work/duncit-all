import { Box, InputAdornment, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
}

/** Sidebar title, hint and the search box that filters the commands. */
export function SuggestionsHeader({ search, onSearchChange }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
      <Typography variant="subtitle2" sx={{
        fontWeight: 800
      }}>
        {t('tech.terminal.suggestions')}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          display: 'block',
          mt: 0.5
        }}>
        {t('tech.terminal.suggestionsHint')}
      </Typography>
      <TextField
        fullWidth
        size="small"
        margin="dense"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={t('tech.terminal.search')}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },

          htmlInput: { 'aria-label': t('tech.terminal.search') }
        }} />
    </Box>
  );
}
