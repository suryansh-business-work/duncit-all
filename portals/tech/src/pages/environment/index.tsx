import { useState } from 'react';
import { Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import EnvVariablesTab from './EnvVariablesTab';
import PortalMappingTab from './PortalMappingTab';

type Section = 'variables' | 'mapping';

export default function EnvironmentPage() {
  const [section, setSection] = useState<Section>('variables');

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <TuneIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800}>Environment Variables</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage credential entries per category, then map which entries each portal uses.
          </Typography>
        </Box>
      </Stack>

      <Tabs value={section} onChange={(_, v) => setSection(v)}>
        <Tab value="variables" label="Variables" />
        <Tab value="mapping" label="Portal Mapping" />
      </Tabs>

      {section === 'variables' ? <EnvVariablesTab /> : <PortalMappingTab />}
    </Stack>
  );
}
