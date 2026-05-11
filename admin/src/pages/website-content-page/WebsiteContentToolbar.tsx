import { Box, Button, Stack, Tab, Tabs, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PAGE_TYPES, type WebsitePageType } from './queries';

interface Props {
  activeType: WebsitePageType;
  onTypeChange: (type: WebsitePageType) => void;
  onCreate: () => void;
}

export default function WebsiteContentToolbar({ activeType, onTypeChange, onCreate }: Props) {
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Website Content</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage Careers, Newsroom, and Blog entries published on duncit.com.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
          New Entry
        </Button>
      </Stack>
      <Tabs
        value={activeType}
        onChange={(_event, value) => onTypeChange(value)}
        textColor="primary"
        indicatorColor="primary"
      >
        {PAGE_TYPES.map((type) => (
          <Tab key={type.value} value={type.value} label={type.label} />
        ))}
      </Tabs>
    </Stack>
  );
}