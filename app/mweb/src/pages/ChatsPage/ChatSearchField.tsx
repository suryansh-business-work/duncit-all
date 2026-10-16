import { InputAdornment, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  testId: string;
}

/** The pill search box over a chat list — pod rooms and club rooms alike. */
export default function ChatSearchField({ value, onChange, placeholder, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <TextField
      size="small"
      data-testid={testId}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{
        '& .MuiOutlinedInput-root': { borderRadius: 999, bgcolor: 'background.paper', minHeight: 50 },
        '& .MuiOutlinedInput-root fieldset': { borderColor: 'var(--duncit-card-border)' },
      }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
        },
        htmlInput: { 'aria-label': t('mweb.chats.searchChats'), 'data-testid': `${testId}-input` },
      }}
    />
  );
}
