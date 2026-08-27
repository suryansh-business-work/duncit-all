import { Box, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import SearchIcon from '@mui/icons-material/Search';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface PodIdeasHeaderProps {
  search: string;
  setSearch: (v: string) => void;
  onShare: () => void;
}

export default function PodIdeasHeader({ search, setSearch, onShare }: Readonly<PodIdeasHeaderProps>) {
  const { t } = useTranslation();
  return (
    <>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          mb: 2
        }}>
        <LightbulbIcon color="warning" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>
            Pod Ideas
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            Suggest a pod, vote on community ideas, and join the conversation.
          </Typography>
        </Box>
        <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={onShare}>
          Share idea
        </DuncitButton>
      </Stack>

      <TextField
        fullWidth
        size="small"
        placeholder={t('mweb.podIdeas.searchIdeas')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }
        }}
      />
    </>
  );
}
